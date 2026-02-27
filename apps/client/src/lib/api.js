import { API_BASE_URL } from './config';
async function parseJson(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
    }
    return (await res.json());
}
export async function createRoom(payload) {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return parseJson(res);
}
export async function previewInvite(inviteToken) {
    const res = await fetch(`${API_BASE_URL}/api/invite/${inviteToken}`);
    return parseJson(res);
}
export async function joinInvite(inviteToken, displayName) {
    const res = await fetch(`${API_BASE_URL}/api/invite/${inviteToken}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
    });
    return parseJson(res);
}
export async function saveOfflineGame(payload) {
    const res = await fetch(`${API_BASE_URL}/api/offline/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return parseJson(res);
}
