export type DiscColor = 'red' | 'yellow';
export type CellValue = DiscColor | null;

export type PreferredColor = DiscColor | 'random';

export type TimeControl =
  | { type: 'none' }
  | { type: 'clock'; secondsPerPlayer: number };

export type GameMode = 'online' | 'offline';

export type FinishReason = 'win' | 'draw' | 'timeout' | 'disconnect';

export interface PlayerView {
  id: string;
  displayName: string;
  color: DiscColor;
  connected: boolean;
}

export interface WinLine {
  from: [number, number];
  to: [number, number];
}

export interface GameState {
  gameId: string;
  roomId?: string;
  mode: GameMode;
  board: CellValue[][];
  currentTurnColor: DiscColor;
  status: 'waiting' | 'active' | 'finished';
  players: PlayerView[];
  winnerColor: DiscColor | null;
  winLine: WinLine | null;
  lastMove: { row: number; col: number; color: DiscColor } | null;
  moveCount: number;
  timeControl: TimeControl;
  timeLeftMs?: Record<DiscColor, number>;
  paused?: boolean;
  disconnectDeadlineAt?: number;
}

export interface CreateRoomRequest {
  preferredColor: PreferredColor;
  timeControl: TimeControl;
  displayName?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  inviteToken: string;
  inviteUrl: string;
  playerToken: string;
  yourColor: DiscColor;
}

export interface InvitePreviewResponse {
  valid: boolean;
  roomId?: string;
  hostName?: string;
  status?: 'waiting' | 'active' | 'finished';
}

export interface JoinInviteRequest {
  displayName?: string;
}

export interface JoinInviteResponse {
  roomId: string;
  playerToken: string;
  yourColor: DiscColor;
}

export interface SaveOfflineGameRequest {
  displayName?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  preferredColor: PreferredColor;
  playerColor: DiscColor;
  timeControl: TimeControl;
  finishedReason: FinishReason;
  winnerColor: DiscColor | null;
  moves: Array<{ moveNumber: number; color: DiscColor; column: number; row: number; playedAt: string }>;
}

export type ClientEvent =
  | { type: 'join_room'; playerToken: string }
  | { type: 'make_move'; column: number }
  | { type: 'request_rematch' }
  | { type: 'decline_rematch' }
  | { type: 'heartbeat' };

export type ServerEvent =
  | { type: 'room_state'; state: GameState }
  | { type: 'game_started'; state: GameState }
  | { type: 'move_applied'; state: GameState }
  | { type: 'timer_update'; state: GameState }
  | { type: 'player_disconnected'; playerId: string; disconnectDeadlineAt: number }
  | { type: 'player_reconnected'; playerId: string }
  | { type: 'game_finished'; state: GameState; reason: FinishReason }
  | { type: 'rematch_requested'; byPlayerId: string }
  | { type: 'rematch_started'; state: GameState }
  | { type: 'error_event'; message: string };
