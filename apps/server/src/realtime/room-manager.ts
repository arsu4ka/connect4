import type {
  ClientEvent,
  CreateRoomRequest,
  CreateRoomResponse,
  DiscColor,
  FinishReason,
  GameState,
  InvitePreviewResponse,
  JoinInviteResponse,
  ServerEvent,
  TimeControl
} from '@connect4/shared';
import { applyMove, createEmptyBoard, findWinLine, isDraw, oppositeColor } from '../engine/logic';
import { Persistence } from '../db/prisma';

interface SocketLike {
  send: (data: string) => void;
}

interface PlayerSlot {
  id: string;
  token: string;
  displayName: string;
  color: DiscColor;
  connected: boolean;
  socket?: SocketLike;
}

interface MoveRecord {
  moveNumber: number;
  color: DiscColor;
  column: number;
  row: number;
  playedAt: Date;
  timeLeftAfterMoveMs?: number;
}

interface ActiveGame {
  gameId: string;
  mode: 'online';
  board: (DiscColor | null)[][];
  status: 'waiting' | 'active' | 'finished';
  currentTurnColor: DiscColor;
  winnerColor: DiscColor | null;
  winLine: GameState['winLine'];
  lastMove: GameState['lastMove'];
  moveCount: number;
  timeControl: TimeControl;
  timeLeftMs?: Record<DiscColor, number>;
  turnStartedAt: number;
  paused: boolean;
  disconnectDeadlineAt?: number;
  disconnectPlayerId?: string;
  moves: MoveRecord[];
  lastTimerSecond: number;
}

interface RoomSession {
  id: string;
  inviteToken: string;
  status: 'waiting' | 'active' | 'finished';
  host: PlayerSlot;
  guest?: PlayerSlot;
  timeControl: TimeControl;
  createdAt: number;
  currentGame?: ActiveGame;
  rematchVotes: Set<string>;
}

function randomToken(bytes = 12): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('base64url');
}

function randomColor(): DiscColor {
  return Math.random() < 0.5 ? 'red' : 'yellow';
}

function computeHostColor(pref: CreateRoomRequest['preferredColor']): DiscColor {
  if (pref === 'random') return randomColor();
  return pref;
}

function roomPlayerList(room: RoomSession): PlayerSlot[] {
  return room.guest ? [room.host, room.guest] : [room.host];
}

export class RoomManager {
  private roomsById = new Map<string, RoomSession>();
  private roomsByInvite = new Map<string, string>();
  private roomByPlayerToken = new Map<string, string>();
  private persistence: Persistence;
  private publicBaseUrl: string;
  private disconnectTimeoutMs: number;

  constructor(params: {
    persistence: Persistence;
    publicBaseUrl: string;
    disconnectTimeoutSeconds: number;
  }) {
    this.persistence = params.persistence;
    this.publicBaseUrl = params.publicBaseUrl.replace(/\/$/, '');
    this.disconnectTimeoutMs = params.disconnectTimeoutSeconds * 1000;
  }

  async createRoom(req: CreateRoomRequest): Promise<CreateRoomResponse> {
    const roomId = crypto.randomUUID();
    const inviteToken = randomToken(16);
    const hostToken = randomToken(16);
    const hostColor = computeHostColor(req.preferredColor);

    const host: PlayerSlot = {
      id: crypto.randomUUID(),
      token: hostToken,
      displayName: req.displayName?.trim() || 'Host',
      color: hostColor,
      connected: false
    };

    const room: RoomSession = {
      id: roomId,
      inviteToken,
      status: 'waiting',
      host,
      timeControl: req.timeControl,
      createdAt: Date.now(),
      rematchVotes: new Set()
    };

    this.roomsById.set(roomId, room);
    this.roomsByInvite.set(inviteToken, roomId);
    this.roomByPlayerToken.set(hostToken, roomId);

    await this.persistence.createRoom(roomId, inviteToken);

    return {
      roomId,
      inviteToken,
      inviteUrl: `${this.publicBaseUrl}/online/join/${inviteToken}`,
      playerToken: hostToken,
      yourColor: hostColor
    };
  }

  previewInvite(inviteToken: string): InvitePreviewResponse {
    const roomId = this.roomsByInvite.get(inviteToken);
    if (!roomId) return { valid: false };

    const room = this.roomsById.get(roomId);
    if (!room) return { valid: false };

    return {
      valid: room.status === 'waiting' && !room.guest,
      roomId,
      hostName: room.host.displayName,
      status: room.status
    };
  }

  joinByInvite(inviteToken: string, displayName?: string): JoinInviteResponse | null {
    const roomId = this.roomsByInvite.get(inviteToken);
    if (!roomId) return null;

    const room = this.roomsById.get(roomId);
    if (!room || room.status !== 'waiting' || room.guest) return null;

    const guestColor = oppositeColor(room.host.color);
    const guestToken = randomToken(16);
    const guest: PlayerSlot = {
      id: crypto.randomUUID(),
      token: guestToken,
      displayName: displayName?.trim() || 'Guest',
      color: guestColor,
      connected: false
    };

    room.guest = guest;
    room.status = 'active';
    room.rematchVotes.clear();
    this.roomByPlayerToken.set(guestToken, room.id);
    void this.persistence.setRoomStatus(room.id, 'active');

    return {
      roomId: room.id,
      playerToken: guestToken,
      yourColor: guestColor
    };
  }

  connectPlayer(roomId: string, playerToken: string, socket: SocketLike): boolean {
    const room = this.roomsById.get(roomId);
    if (!room) return false;

    const player = this.findPlayerByToken(room, playerToken);
    if (!player) return false;

    player.socket = socket;
    player.connected = true;
    this.sendStateToPlayer(room, player);

    if (room.currentGame?.paused && room.currentGame.disconnectPlayerId === player.id) {
      room.currentGame.paused = false;
      room.currentGame.disconnectPlayerId = undefined;
      room.currentGame.disconnectDeadlineAt = undefined;
      room.currentGame.turnStartedAt = Date.now();
      this.broadcast(room, { type: 'player_reconnected', playerId: player.id });
      this.broadcastState(room, 'timer_update');
    }

    this.startGameIfReady(room);
    return true;
  }

  disconnectPlayer(roomId: string, playerToken: string): void {
    const room = this.roomsById.get(roomId);
    if (!room) return;

    const player = this.findPlayerByToken(room, playerToken);
    if (!player) return;

    player.connected = false;
    player.socket = undefined;

    const game = room.currentGame;
    if (!game || game.status !== 'active' || game.paused) return;

    game.paused = true;
    game.disconnectPlayerId = player.id;
    game.disconnectDeadlineAt = Date.now() + this.disconnectTimeoutMs;

    this.broadcast(room, {
      type: 'player_disconnected',
      playerId: player.id,
      disconnectDeadlineAt: game.disconnectDeadlineAt
    });
    this.broadcastState(room, 'timer_update');
  }

  handleEvent(roomId: string, playerToken: string, event: ClientEvent): void {
    const room = this.roomsById.get(roomId);
    if (!room) return;

    const player = this.findPlayerByToken(room, playerToken);
    if (!player) return;

    if (event.type === 'make_move') {
      this.makeMove(room, player, event.column);
      return;
    }

    if (event.type === 'request_rematch') {
      this.requestRematch(room, player);
      return;
    }

    if (event.type === 'decline_rematch') {
      room.rematchVotes.clear();
      return;
    }
  }

  tick(now = Date.now()): void {
    for (const room of this.roomsById.values()) {
      const game = room.currentGame;
      if (!game || game.status !== 'active') continue;

      if (game.paused && game.disconnectDeadlineAt && now >= game.disconnectDeadlineAt) {
        const disconnected = roomPlayerList(room).find(
          (player) => player.id === game.disconnectPlayerId
        );
        if (!disconnected) continue;
        void this.finishGame(room, 'disconnect', oppositeColor(disconnected.color));
        continue;
      }

      if (game.timeControl.type === 'clock' && !game.paused && game.timeLeftMs) {
        const elapsed = now - game.turnStartedAt;
        const activeColor = game.currentTurnColor;
        const remaining = game.timeLeftMs[activeColor] - elapsed;
        if (remaining <= 0) {
          game.timeLeftMs[activeColor] = 0;
          void this.finishGame(room, 'timeout', oppositeColor(activeColor));
          continue;
        }

        const wholeSecond = Math.floor(remaining / 1000);
        if (wholeSecond !== game.lastTimerSecond) {
          game.lastTimerSecond = wholeSecond;
          this.broadcastState(room, 'timer_update', now);
        }
      }
    }
  }

  getRoomIdByPlayerToken(token: string): string | undefined {
    return this.roomByPlayerToken.get(token);
  }

  private findPlayerByToken(room: RoomSession, token: string): PlayerSlot | undefined {
    return roomPlayerList(room).find((p) => p.token === token);
  }

  private startGameIfReady(room: RoomSession, previousGameId?: string): void {
    if (!room.guest) return;
    if (room.currentGame && room.currentGame.status !== 'finished') return;

    const gameId = crypto.randomUUID();
    const now = Date.now();
    const firstColor: DiscColor = 'red';
    const startingColor = room.host.color === firstColor ? room.host.color : room.guest.color;

    const game: ActiveGame = {
      gameId,
      mode: 'online',
      board: createEmptyBoard(),
      status: 'active',
      currentTurnColor: startingColor,
      winnerColor: null,
      winLine: null,
      lastMove: null,
      moveCount: 0,
      timeControl: room.timeControl,
      timeLeftMs:
        room.timeControl.type === 'clock'
          ? {
              red: room.timeControl.secondsPerPlayer * 1000,
              yellow: room.timeControl.secondsPerPlayer * 1000
            }
          : undefined,
      turnStartedAt: now,
      paused: false,
      moves: [],
      lastTimerSecond: room.timeControl.type === 'clock' ? room.timeControl.secondsPerPlayer : -1
    };

    room.currentGame = game;
    room.rematchVotes.clear();

    void this.persistence.createGame({
      id: gameId,
      roomId: room.id,
      previousGameId,
      mode: 'online',
      timeControl: room.timeControl,
      seats: [
        {
          seat: 'p1',
          color: room.host.color,
          isBot: false,
          displayName: room.host.displayName
        },
        {
          seat: 'p2',
          color: room.guest.color,
          isBot: false,
          displayName: room.guest.displayName
        }
      ]
    });

    this.broadcast(room, {
      type: 'game_started',
      state: this.toGameState(room, Date.now())
    });
  }

  private effectiveTimeLeft(
    game: ActiveGame,
    now = Date.now()
  ): Record<DiscColor, number> | undefined {
    if (!game.timeLeftMs) return undefined;
    if (game.status !== 'active' || game.paused) return { ...game.timeLeftMs };

    const activeColor = game.currentTurnColor;
    const elapsed = now - game.turnStartedAt;
    return {
      ...game.timeLeftMs,
      [activeColor]: Math.max(0, game.timeLeftMs[activeColor] - elapsed)
    };
  }

  private toGameState(room: RoomSession, now = Date.now()): GameState {
    const game = room.currentGame;
    if (!game) {
      return {
        gameId: '',
        roomId: room.id,
        mode: 'online',
        board: createEmptyBoard(),
        currentTurnColor: room.host.color,
        status: 'waiting',
        players: roomPlayerList(room).map((player) => ({
          id: player.id,
          displayName: player.displayName,
          color: player.color,
          connected: player.connected
        })),
        winnerColor: null,
        winLine: null,
        lastMove: null,
        moveCount: 0,
        timeControl: room.timeControl
      };
    }

    return {
      gameId: game.gameId,
      roomId: room.id,
      mode: 'online',
      board: game.board,
      currentTurnColor: game.currentTurnColor,
      status: game.status,
      players: roomPlayerList(room).map((player) => ({
        id: player.id,
        displayName: player.displayName,
        color: player.color,
        connected: player.connected
      })),
      winnerColor: game.winnerColor,
      winLine: game.winLine,
      lastMove: game.lastMove,
      moveCount: game.moveCount,
      timeControl: game.timeControl,
      timeLeftMs: this.effectiveTimeLeft(game, now),
      paused: game.paused,
      disconnectDeadlineAt: game.disconnectDeadlineAt
    };
  }

  private broadcast(room: RoomSession, event: ServerEvent): void {
    for (const player of roomPlayerList(room)) {
      if (!player.connected || !player.socket) continue;
      player.socket.send(JSON.stringify(event));
    }
  }

  private sendStateToPlayer(room: RoomSession, player: PlayerSlot): void {
    if (!player.socket) return;
    const event: ServerEvent = {
      type: 'room_state',
      state: this.toGameState(room)
    };
    player.socket.send(JSON.stringify(event));
  }

  private broadcastState(
    room: RoomSession,
    type: Extract<ServerEvent['type'], 'room_state' | 'move_applied' | 'timer_update'>,
    now = Date.now()
  ): void {
    const event: ServerEvent = {
      type,
      state: this.toGameState(room, now)
    } as ServerEvent;
    this.broadcast(room, event);
  }

  private makeMove(room: RoomSession, player: PlayerSlot, column: number): void {
    const game = room.currentGame;
    if (!game || game.status !== 'active') return;
    if (game.paused) return;
    if (player.color !== game.currentTurnColor) return;

    const moved = applyMove(game.board, column, player.color);
    if (!moved) {
      this.sendError(player, 'Invalid move');
      return;
    }

    let playerTimeAfterMove: number | undefined;
    if (game.timeControl.type === 'clock' && game.timeLeftMs) {
      const elapsed = Date.now() - game.turnStartedAt;
      const remaining = game.timeLeftMs[player.color] - elapsed;
      if (remaining <= 0) {
        game.timeLeftMs[player.color] = 0;
        void this.finishGame(room, 'timeout', oppositeColor(player.color));
        return;
      }
      game.timeLeftMs[player.color] = remaining;
      playerTimeAfterMove = remaining;
    }

    game.board = moved.board;
    game.lastMove = { row: moved.row, col: moved.col, color: player.color };
    game.moveCount += 1;

    const moveRecord: MoveRecord = {
      moveNumber: game.moveCount,
      color: player.color,
      column: moved.col,
      row: moved.row,
      playedAt: new Date(),
      timeLeftAfterMoveMs: playerTimeAfterMove
    };
    game.moves.push(moveRecord);

    void this.persistence.recordMove(game.gameId, moveRecord);

    const winLine = findWinLine(game.board, moved.row, moved.col, player.color);
    if (winLine) {
      game.winLine = winLine;
      void this.finishGame(room, 'win', player.color);
      return;
    }

    if (isDraw(game.board)) {
      void this.finishGame(room, 'draw', null);
      return;
    }

    game.currentTurnColor = oppositeColor(player.color);
    game.turnStartedAt = Date.now();
    if (game.timeControl.type === 'clock' && game.timeLeftMs) {
      game.lastTimerSecond = Math.floor(game.timeLeftMs[game.currentTurnColor] / 1000);
    }

    this.broadcastState(room, 'move_applied');
  }

  private finishGame(room: RoomSession, reason: FinishReason, winnerColor: DiscColor | null): void {
    const game = room.currentGame;
    if (!game || game.status === 'finished') return;

    game.status = 'finished';
    game.winnerColor = winnerColor;
    game.paused = false;
    game.disconnectPlayerId = undefined;
    game.disconnectDeadlineAt = undefined;

    void this.persistence.finishGame({
      gameId: game.gameId,
      reason,
      winnerColor
    });

    this.broadcast(room, {
      type: 'game_finished',
      reason,
      state: this.toGameState(room)
    });
  }

  private requestRematch(room: RoomSession, player: PlayerSlot): void {
    const game = room.currentGame;
    if (!game || game.status !== 'finished' || !room.guest) return;

    room.rematchVotes.add(player.id);
    this.broadcast(room, {
      type: 'rematch_requested',
      byPlayerId: player.id
    });

    if (room.rematchVotes.size < 2) return;

    room.rematchVotes.clear();
    const previousGameId = game.gameId;

    const hostNewColor = oppositeColor(room.host.color);
    const guestNewColor = oppositeColor(room.guest.color);
    room.host.color = hostNewColor;
    room.guest.color = guestNewColor;

    this.startGameIfReady(room, previousGameId);

    if (!room.currentGame) return;

    this.broadcast(room, {
      type: 'rematch_started',
      state: this.toGameState(room)
    });
  }

  private sendError(player: PlayerSlot, message: string): void {
    if (!player.socket) return;
    const event: ServerEvent = { type: 'error_event', message };
    player.socket.send(JSON.stringify(event));
  }
}
