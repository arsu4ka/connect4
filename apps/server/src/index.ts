import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import type { ClientEvent, SaveOfflineGameRequest } from '@connect4/shared';
import { serializeError, type StudioBFFRequest } from '@prisma/studio-core/data/bff';
import { createPostgresJSExecutor } from '@prisma/studio-core/data/postgresjs';
import postgres from 'postgres';
import { Persistence } from './db/prisma';
import { RoomManager } from './realtime/room-manager';

const PORT = Number(process.env.PORT ?? 3001);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
const DISCONNECT_TIMEOUT_SECONDS = Number(process.env.DISCONNECT_TIMEOUT_SECONDS ?? 60);
const STUDIO_ENABLED = process.env.STUDIO_ENABLED !== 'false';
const STUDIO_ADMIN_TOKEN = process.env.STUDIO_ADMIN_TOKEN ?? '';
const STUDIO_ALLOWED_HOST = process.env.STUDIO_ALLOWED_HOST ?? '';
const DATABASE_URL = process.env.DATABASE_URL ?? '';

const persistence = new Persistence();
const roomManager = new RoomManager({
  persistence,
  publicBaseUrl: PUBLIC_BASE_URL,
  disconnectTimeoutSeconds: DISCONNECT_TIMEOUT_SECONDS
});
const studioSql = STUDIO_ENABLED && DATABASE_URL ? postgres(DATABASE_URL) : null;
const studioExecutor = studioSql ? createPostgresJSExecutor(studioSql) : null;

interface WsSession {
  roomId: string;
  playerToken: string;
}

const wsSession = new Map<string, WsSession>();

function getWsSessionId(ws: unknown): string | null {
  const candidate = ws as { id?: string | number };
  if (candidate?.id === undefined || candidate.id === null) return null;
  return String(candidate.id);
}

function getRoomIdFromWs(ws: unknown): string {
  const data = ws as { data?: { params?: { roomId?: unknown } } };
  return typeof data.data?.params?.roomId === 'string' ? data.data.params.roomId : '';
}

function getPlayerTokenFromQuery(ws: unknown): string | null {
  const data = ws as { data?: { query?: { playerToken?: unknown } } };
  const token = data.data?.query?.playerToken;
  if (typeof token !== 'string' || token.trim().length === 0) return null;
  return token;
}

function parseClientEvent(raw: unknown): ClientEvent | null {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as ClientEvent;
  }

  if (raw instanceof Uint8Array) {
    const text = Buffer.from(raw).toString('utf8');
    return JSON.parse(text) as ClientEvent;
  }

  if (typeof raw === 'object' && raw !== null) {
    return raw as ClientEvent;
  }

  return null;
}

function getStudioToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token.length > 0) return token;
  }

  const tokenHeader = request.headers.get('x-admin-token');
  if (tokenHeader && tokenHeader.trim().length > 0) {
    return tokenHeader.trim();
  }

  return null;
}

function isStudioHostAllowed(request: Request): boolean {
  if (!STUDIO_ALLOWED_HOST) return true;

  const hostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const host = hostHeader.split(',')[0]?.trim().split(':')[0] ?? '';

  return host.toLowerCase() === STUDIO_ALLOWED_HOST.toLowerCase();
}

function isStudioAuthorized(request: Request): boolean {
  if (!STUDIO_ADMIN_TOKEN) return false;
  const token = getStudioToken(request);
  if (!token) return false;
  return token === STUDIO_ADMIN_TOKEN;
}

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
          t.Object({
            type: t.Literal('clock'),
            secondsPerPlayer: t.Number({ minimum: 10, maximum: 3600 })
          })
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
        finishedReason: t.Union([
          t.Literal('win'),
          t.Literal('draw'),
          t.Literal('timeout'),
          t.Literal('disconnect')
        ]),
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
  .post(
    '/api/studio',
    async ({ body, request, set }) => {
      if (!STUDIO_ENABLED || !studioExecutor) {
        set.status = 404;
        return { message: 'Studio endpoint is disabled.' };
      }

      if (!isStudioHostAllowed(request)) {
        set.status = 403;
        return { message: 'Studio endpoint is not available on this host.' };
      }

      if (!isStudioAuthorized(request)) {
        set.status = 401;
        return { message: 'Unauthorized' };
      }

      const payload = body as StudioBFFRequest;

      if (payload.procedure === 'query') {
        if (!('query' in payload)) {
          set.status = 400;
          return { message: 'Missing Studio query payload.' };
        }
        const [error, result] = await studioExecutor.execute(payload.query);
        return [error ? serializeError(error) : null, result ?? null] as const;
      }

      if (payload.procedure === 'sequence') {
        if (!('sequence' in payload) || !Array.isArray(payload.sequence)) {
          set.status = 400;
          return { message: 'Missing Studio sequence payload.' };
        }
        if (payload.sequence.length !== 2) {
          set.status = 400;
          return { message: 'Studio sequence must contain exactly 2 queries.' };
        }

        const [firstError, firstResult] = await studioExecutor.execute(payload.sequence[0]);
        if (firstError) {
          return [[serializeError(firstError), null]] as const;
        }

        const [secondError, secondResult] = await studioExecutor.execute(payload.sequence[1]);
        return [
          [null, firstResult ?? null],
          [secondError ? serializeError(secondError) : null, secondResult ?? null]
        ] as const;
      }

      set.status = 400;
      return { message: 'Invalid Studio request.' };
    },
    {
      body: t.Object({
        procedure: t.Union([t.Literal('query'), t.Literal('sequence')]),
        query: t.Optional(t.Any()),
        sequence: t.Optional(t.Array(t.Any())),
        customPayload: t.Optional(t.Record(t.String(), t.Any()))
      })
    }
  )
  .ws('/ws/rooms/:roomId', {
    open: (ws) => {
      const wsId = getWsSessionId(ws);
      if (!wsId) return;

      const roomId = getRoomIdFromWs(ws);
      const session: WsSession = { roomId, playerToken: '' };
      wsSession.set(wsId, session);

      if (!roomId) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'missing_room_id' }));
        return;
      }

      const queryToken = getPlayerTokenFromQuery(ws);
      if (!queryToken) return;

      const connected = roomManager.connectPlayer(roomId, queryToken, ws as never);
      if (!connected) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'auth_failed' }));
        return;
      }

      session.playerToken = queryToken;
    },
    message: (ws, raw) => {
      let parsed: ClientEvent | null = null;
      try {
        parsed = parseClientEvent(raw);
      } catch {
        ws.send(JSON.stringify({ type: 'error_event', message: 'Invalid JSON' }));
        return;
      }

      if (!parsed) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'invalid_payload' }));
        return;
      }

      const wsId = getWsSessionId(ws);
      if (!wsId) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'session_error' }));
        return;
      }

      const current = wsSession.get(wsId) ?? { roomId: getRoomIdFromWs(ws), playerToken: '' };
      wsSession.set(wsId, current);

      if (parsed?.type === 'join_room') {
        const roomId = current.roomId || getRoomIdFromWs(ws);
        if (!roomId) {
          ws.send(JSON.stringify({ type: 'error_event', message: 'missing_room_id' }));
          return;
        }

        const connected = roomManager.connectPlayer(roomId, parsed.playerToken, ws as never);
        if (!connected) {
          ws.send(JSON.stringify({ type: 'error_event', message: 'auth_failed' }));
          return;
        }

        wsSession.set(wsId, { roomId, playerToken: parsed.playerToken });
        return;
      }

      if (!current.playerToken) {
        const queryToken = getPlayerTokenFromQuery(ws);
        if (queryToken && current.roomId) {
          const connected = roomManager.connectPlayer(current.roomId, queryToken, ws as never);
          if (connected) {
            current.playerToken = queryToken;
            wsSession.set(wsId, current);
          }
        }
      }

      if (!current.playerToken) {
        ws.send(JSON.stringify({ type: 'error_event', message: 'auth_required' }));
        return;
      }

      roomManager.handleEvent(current.roomId, current.playerToken, parsed);
    },
    close: (ws) => {
      const wsId = getWsSessionId(ws);
      if (!wsId) return;

      const current = wsSession.get(wsId);
      wsSession.delete(wsId);

      if (!current || !current.playerToken) return;
      roomManager.disconnectPlayer(current.roomId, current.playerToken);
    }
  });

setInterval(() => {
  roomManager.tick();
}, 250);

app.listen(PORT);

console.log(`Connect Four server listening on http://localhost:${PORT}`);
