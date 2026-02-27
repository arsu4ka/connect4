import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import type { ClientEvent, SaveOfflineGameRequest } from '@connect4/shared';
import { Persistence } from './db/prisma';
import { RoomManager } from './realtime/room-manager';

const PORT = Number(process.env.PORT ?? 3001);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
const DISCONNECT_TIMEOUT_SECONDS = Number(process.env.DISCONNECT_TIMEOUT_SECONDS ?? 60);

const persistence = new Persistence();
const roomManager = new RoomManager({
  persistence,
  publicBaseUrl: PUBLIC_BASE_URL,
  disconnectTimeoutSeconds: DISCONNECT_TIMEOUT_SECONDS
});

const wsSession = new WeakMap<object, { roomId: string; playerToken: string }>();

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS']
    })
  )
  .get('/health', () => ({ ok: true, now: new Date().toISOString() }))
  .post(
    '/api/rooms',
    async ({ body }) => {
      return roomManager.createRoom(body);
    },
    {
      body: t.Object({
        preferredColor: t.Union([t.Literal('red'), t.Literal('yellow'), t.Literal('random')]),
        timeControl: t.Union([
          t.Object({ type: t.Literal('none') }),
          t.Object({ type: t.Literal('clock'), secondsPerPlayer: t.Number({ minimum: 10, maximum: 3600 }) })
        ]),
        displayName: t.Optional(t.String({ minLength: 1, maxLength: 30 }))
      })
    }
  )
  .get('/api/invite/:inviteToken', ({ params }) => {
    return roomManager.previewInvite(params.inviteToken);
  })
  .post(
    '/api/invite/:inviteToken/join',
    ({ params, body, set }) => {
      const joined = roomManager.joinByInvite(params.inviteToken, body.displayName);
      if (!joined) {
        set.status = 400;
        return { message: 'Invite is not valid or already used' };
      }
      return joined;
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String({ minLength: 1, maxLength: 30 }))
      })
    }
  )
  .post(
    '/api/offline/games',
    async ({ body }) => {
      const payload = body as SaveOfflineGameRequest;
      const gameId = crypto.randomUUID();
      await persistence.saveOfflineGame({
        gameId,
        difficulty: payload.difficulty,
        timeControl: payload.timeControl,
        winnerColor: payload.winnerColor,
        finishedReason: payload.finishedReason,
        playerName: payload.displayName?.trim() || 'Player',
        playerColor: payload.playerColor,
        moves: payload.moves.map((move: SaveOfflineGameRequest['moves'][number]) => ({
          ...move,
          playedAt: new Date(move.playedAt)
        }))
      });

      return { gameId };
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String()),
        difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]),
        preferredColor: t.Union([t.Literal('red'), t.Literal('yellow'), t.Literal('random')]),
        playerColor: t.Union([t.Literal('red'), t.Literal('yellow')]),
        timeControl: t.Union([
          t.Object({ type: t.Literal('none') }),
          t.Object({ type: t.Literal('clock'), secondsPerPlayer: t.Number() })
        ]),
        finishedReason: t.Union([t.Literal('win'), t.Literal('draw'), t.Literal('timeout'), t.Literal('disconnect')]),
        winnerColor: t.Union([t.Literal('red'), t.Literal('yellow'), t.Null()]),
        moves: t.Array(
          t.Object({
            moveNumber: t.Number(),
            color: t.Union([t.Literal('red'), t.Literal('yellow')]),
            column: t.Number({ minimum: 0, maximum: 6 }),
            row: t.Number({ minimum: 0, maximum: 5 }),
            playedAt: t.String()
          })
        )
      })
    }
  )
  .get('/api/games/:gameId', async ({ params, set }) => {
    const game = await persistence.getGameById(params.gameId);
    if (!game) {
      set.status = 404;
      return { message: 'Game not found' };
    }
    return game;
  })
  .ws('/ws/rooms/:roomId', {
    open: (ws) => {
      const roomId = String((ws.data as { params?: { roomId?: string } }).params?.roomId ?? '');
      wsSession.set(ws as unknown as object, { roomId, playerToken: '' });
    },
    message: (ws, raw) => {
      let parsed: ClientEvent | null = null;
      try {
        parsed = typeof raw === 'string' ? (JSON.parse(raw) as ClientEvent) : (raw as ClientEvent);
      } catch {
        ws.send(JSON.stringify({ type: 'error_event', message: 'Invalid JSON' }));
        return;
      }

      const current = wsSession.get(ws as unknown as object);
      if (!current) return;

      if (parsed?.type === 'join_room') {
        const roomId = String((ws.data as { params?: { roomId?: string } }).params?.roomId ?? current.roomId);
        const connected = roomManager.connectPlayer(roomId, parsed.playerToken, ws as never);
        if (!connected) {
          ws.send(JSON.stringify({ type: 'error_event', message: 'Failed to join room' }));
          return;
        }
        wsSession.set(ws as unknown as object, { roomId, playerToken: parsed.playerToken });
        return;
      }

      if (!current.playerToken) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'Join room first' }));
        return;
      }

      roomManager.handleEvent(current.roomId, current.playerToken, parsed);
    },
    close: (ws) => {
      const current = wsSession.get(ws as unknown as object);
      if (!current || !current.playerToken) return;
      roomManager.disconnectPlayer(current.roomId, current.playerToken);
      wsSession.delete(ws as unknown as object);
    }
  });

setInterval(() => {
  roomManager.tick();
}, 250);

app.listen(PORT);

console.log(`Connect Four server listening on http://localhost:${PORT}`);
