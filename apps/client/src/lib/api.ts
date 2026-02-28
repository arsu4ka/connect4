import type {
  CreateRoomRequest,
  CreateRoomResponse,
  InvitePreviewResponse,
  JoinInviteResponse,
  SaveOfflineGameRequest
} from '@connect4/shared';
import { API_BASE_URL } from './config';

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function createRoom(payload: CreateRoomRequest): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseJson<CreateRoomResponse>(res);
}

export async function previewInvite(inviteToken: string): Promise<InvitePreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/api/invite/${inviteToken}`);
  return parseJson<InvitePreviewResponse>(res);
}

export async function joinInvite(
  inviteToken: string,
  displayName?: string
): Promise<JoinInviteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/invite/${inviteToken}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName })
  });
  return parseJson<JoinInviteResponse>(res);
}

export async function saveOfflineGame(
  payload: SaveOfflineGameRequest
): Promise<{ gameId: string }> {
  const res = await fetch(`${API_BASE_URL}/api/offline/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseJson<{ gameId: string }>(res);
}
