import { PrismaClient } from '@prisma/client';
import type { TimeControl } from '@connect4/shared';

export interface SeatInput {
  seat: 'p1' | 'p2';
  color: 'red' | 'yellow';
  isBot: boolean;
  displayName: string;
}

export interface MoveInput {
  moveNumber: number;
  color: 'red' | 'yellow';
  column: number;
  row: number;
  playedAt?: Date;
  timeLeftAfterMoveMs?: number;
}

export class Persistence {
  private prisma: PrismaClient;

  constructor(prisma = new PrismaClient()) {
    this.prisma = prisma;
  }

  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error('[Persistence]', error);
      return fallback;
    }
  }

  async createRoom(id: string, inviteToken: string): Promise<void> {
    await this.safe(
      () =>
        this.prisma.room.create({
          data: { id, inviteToken }
        }),
      undefined
    );
  }

  async setRoomStatus(id: string, status: 'waiting' | 'active' | 'finished'): Promise<void> {
    await this.safe(
      () =>
        this.prisma.room.update({
          where: { id },
          data: {
            status,
            startedAt: status === 'active' ? new Date() : undefined,
            closedAt: status === 'finished' ? new Date() : undefined
          }
        }),
      undefined
    );
  }

  async createGame(params: {
    id: string;
    roomId?: string;
    mode: 'online' | 'offline';
    timeControl: TimeControl;
    difficulty?: string;
    seats: SeatInput[];
  }): Promise<void> {
    const timeControlType = params.timeControl.type;

    await this.safe(
      () =>
        this.prisma.game.create({
          data: {
            id: params.id,
            roomId: params.roomId,
            mode: params.mode,
            status: 'active',
            difficulty: params.difficulty,
            timeControlType,
            secondsPerPlayer: params.timeControl.type === 'clock' ? params.timeControl.secondsPerPlayer : null,
            playerSeats: {
              create: params.seats.map((seat) => ({
                seat: seat.seat,
                color: seat.color,
                isBot: seat.isBot,
                displayName: seat.displayName
              }))
            }
          }
        }),
      undefined
    );
  }

  async recordMove(gameId: string, move: MoveInput): Promise<void> {
    await this.safe(
      () =>
        this.prisma.move.create({
          data: {
            gameId,
            moveNumber: move.moveNumber,
            color: move.color,
            column: move.column,
            row: move.row,
            playedAt: move.playedAt,
            timeLeftAfterMoveMs: move.timeLeftAfterMoveMs
          }
        }),
      undefined
    );
  }

  async finishGame(params: {
    gameId: string;
    reason: 'win' | 'draw' | 'timeout' | 'disconnect';
    winnerColor: 'red' | 'yellow' | null;
  }): Promise<void> {
    await this.safe(
      () =>
        this.prisma.game.update({
          where: { id: params.gameId },
          data: {
            status: 'finished',
            finishedAt: new Date(),
            finishedReason: params.reason,
            winnerColor: params.winnerColor
          }
        }),
      undefined
    );
  }

  async createRematch(previousGameId: string, newGameId: string): Promise<void> {
    await this.safe(
      () =>
        this.prisma.rematch.create({
          data: {
            previousGameId,
            newGameId,
            colorsSwapped: true
          }
        }),
      undefined
    );
  }

  async saveOfflineGame(params: {
    gameId: string;
    difficulty: string;
    timeControl: TimeControl;
    winnerColor: 'red' | 'yellow' | null;
    finishedReason: 'win' | 'draw' | 'timeout' | 'disconnect';
    playerName: string;
    playerColor: 'red' | 'yellow';
    moves: MoveInput[];
  }): Promise<void> {
    await this.safe(
      async () => {
        const timeControlType = params.timeControl.type;
        await this.prisma.game.create({
          data: {
            id: params.gameId,
            mode: 'offline',
            status: 'finished',
            difficulty: params.difficulty,
            timeControlType,
            secondsPerPlayer: params.timeControl.type === 'clock' ? params.timeControl.secondsPerPlayer : null,
            finishedReason: params.finishedReason,
            winnerColor: params.winnerColor,
            finishedAt: new Date(),
            playerSeats: {
              create: [
                {
                  seat: 'p1',
                  color: params.playerColor,
                  isBot: false,
                  displayName: params.playerName
                },
                {
                  seat: 'p2',
                  color: params.playerColor === 'red' ? 'yellow' : 'red',
                  isBot: true,
                  displayName: 'Computer'
                }
              ]
            },
            moves: {
              create: params.moves.map((move) => ({
                moveNumber: move.moveNumber,
                color: move.color,
                column: move.column,
                row: move.row,
                playedAt: move.playedAt,
                timeLeftAfterMoveMs: move.timeLeftAfterMoveMs
              }))
            }
          }
        });
      },
      undefined
    );
  }

  async getGameById(gameId: string): Promise<unknown | null> {
    return this.safe(
      () =>
        this.prisma.game.findUnique({
          where: { id: gameId },
          include: {
            playerSeats: true,
            moves: {
              orderBy: { moveNumber: 'asc' }
            }
          }
        }),
      null
    );
  }
}
