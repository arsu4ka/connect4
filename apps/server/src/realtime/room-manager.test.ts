import { describe, expect, it } from 'vitest';
import { RoomManager } from './room-manager';

class FakePersistence {
  async createRoom(): Promise<void> {}
  async setRoomStatus(): Promise<void> {}
  async createGame(): Promise<void> {}
  async recordMove(): Promise<void> {}
  async finishGame(): Promise<void> {}
}

class FakeSocket {
  sent: unknown[] = [];

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
}

function manager(): RoomManager {
  return new RoomManager({
    persistence: new FakePersistence() as never,
    publicBaseUrl: 'http://localhost:5173',
    disconnectTimeoutSeconds: 60
  });
}

describe('room manager', () => {
  it('creates room and allows single guest join', async () => {
    const rm = manager();
    const room = await rm.createRoom({ preferredColor: 'red', timeControl: { type: 'none' } });
    const join = rm.joinByInvite(room.inviteToken);

    expect(join).not.toBeNull();

    const secondJoin = rm.joinByInvite(room.inviteToken);
    expect(secondJoin).toBeNull();
  });

  it('maps player token to room id', async () => {
    const rm = manager();
    const room = await rm.createRoom({ preferredColor: 'yellow', timeControl: { type: 'none' } });

    expect(rm.getRoomIdByPlayerToken(room.playerToken)).toBe(room.roomId);
  });

  it('finishes game on disconnect timeout', async () => {
    const rm = manager();
    const room = await rm.createRoom({ preferredColor: 'red', timeControl: { type: 'none' } });
    const join = rm.joinByInvite(room.inviteToken);
    expect(join).not.toBeNull();

    const host = new FakeSocket();
    const guest = new FakeSocket();

    expect(rm.connectPlayer(room.roomId, room.playerToken, host)).toBe(true);
    expect(rm.connectPlayer(room.roomId, join!.playerToken, guest)).toBe(true);

    rm.disconnectPlayer(room.roomId, room.playerToken);
    rm.tick(Date.now() + 61_000);

    const finished = [...host.sent, ...guest.sent].find(
      (event) => (event as { type?: string }).type === 'game_finished'
    ) as { reason?: string } | undefined;
    expect(finished?.reason).toBe('disconnect');
  });

  it('swaps colors after rematch', async () => {
    const rm = manager();
    const room = await rm.createRoom({ preferredColor: 'red', timeControl: { type: 'none' } });
    const join = rm.joinByInvite(room.inviteToken);
    expect(join).not.toBeNull();

    const host = new FakeSocket();
    const guest = new FakeSocket();
    rm.connectPlayer(room.roomId, room.playerToken, host);
    rm.connectPlayer(room.roomId, join!.playerToken, guest);

    rm.handleEvent(room.roomId, room.playerToken, { type: 'make_move', column: 0 });
    rm.handleEvent(room.roomId, join!.playerToken, { type: 'make_move', column: 1 });
    rm.handleEvent(room.roomId, room.playerToken, { type: 'make_move', column: 0 });
    rm.handleEvent(room.roomId, join!.playerToken, { type: 'make_move', column: 1 });
    rm.handleEvent(room.roomId, room.playerToken, { type: 'make_move', column: 0 });
    rm.handleEvent(room.roomId, join!.playerToken, { type: 'make_move', column: 1 });
    rm.handleEvent(room.roomId, room.playerToken, { type: 'make_move', column: 0 });

    rm.handleEvent(room.roomId, room.playerToken, { type: 'request_rematch' });
    rm.handleEvent(room.roomId, join!.playerToken, { type: 'request_rematch' });

    const rematchEvent = [...host.sent, ...guest.sent]
      .reverse()
      .find((event) => (event as { type?: string }).type === 'rematch_started') as
      | { state?: { players?: Array<{ color: string }> } }
      | undefined;

    const colors = rematchEvent?.state?.players?.map((player) => player.color) ?? [];
    expect(colors).toContain('yellow');
    expect(colors).toContain('red');
  });

  it('finishes on chess-clock timeout', async () => {
    const rm = manager();
    const room = await rm.createRoom({
      preferredColor: 'red',
      timeControl: { type: 'clock', secondsPerPlayer: 1 }
    });
    const join = rm.joinByInvite(room.inviteToken);
    expect(join).not.toBeNull();

    const host = new FakeSocket();
    const guest = new FakeSocket();
    rm.connectPlayer(room.roomId, room.playerToken, host);
    rm.connectPlayer(room.roomId, join!.playerToken, guest);

    rm.tick(Date.now() + 1500);

    const finished = [...host.sent, ...guest.sent]
      .reverse()
      .find((event) => (event as { type?: string }).type === 'game_finished') as
      | { reason?: string }
      | undefined;
    expect(finished?.reason).toBe('timeout');
  });
});
