import type { DiscColor } from '@connect4/shared';

const TOKENS_KEY = 'c4_player_tokens';
const COLORS_KEY = 'c4_player_colors';
const INVITES_KEY = 'c4_invites';

function readMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, string>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function savePlayerToken(roomId: string, token: string): void {
  const map = readMap(TOKENS_KEY);
  map[roomId] = token;
  writeMap(TOKENS_KEY, map);
}

export function getPlayerToken(roomId: string): string | null {
  const map = readMap(TOKENS_KEY);
  return map[roomId] ?? null;
}

export function savePlayerColor(roomId: string, color: DiscColor): void {
  const map = readMap(COLORS_KEY);
  map[roomId] = color;
  writeMap(COLORS_KEY, map);
}

export function getPlayerColor(roomId: string): DiscColor | null {
  const map = readMap(COLORS_KEY);
  const color = map[roomId];
  return color === 'red' || color === 'yellow' ? color : null;
}

export function saveInviteUrl(roomId: string, inviteUrl: string): void {
  const map = readMap(INVITES_KEY);
  map[roomId] = inviteUrl;
  writeMap(INVITES_KEY, map);
}

export function getInviteUrl(roomId: string): string | null {
  const map = readMap(INVITES_KEY);
  return map[roomId] ?? null;
}
