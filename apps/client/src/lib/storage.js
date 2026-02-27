const TOKENS_KEY = 'c4_player_tokens';
const COLORS_KEY = 'c4_player_colors';
const INVITES_KEY = 'c4_invites';
function readMap(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return {};
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function writeMap(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
export function savePlayerToken(roomId, token) {
    const map = readMap(TOKENS_KEY);
    map[roomId] = token;
    writeMap(TOKENS_KEY, map);
}
export function getPlayerToken(roomId) {
    const map = readMap(TOKENS_KEY);
    return map[roomId] ?? null;
}
export function savePlayerColor(roomId, color) {
    const map = readMap(COLORS_KEY);
    map[roomId] = color;
    writeMap(COLORS_KEY, map);
}
export function getPlayerColor(roomId) {
    const map = readMap(COLORS_KEY);
    const color = map[roomId];
    return color === 'red' || color === 'yellow' ? color : null;
}
export function saveInviteUrl(roomId, inviteUrl) {
    const map = readMap(INVITES_KEY);
    map[roomId] = inviteUrl;
    writeMap(INVITES_KEY, map);
}
export function getInviteUrl(roomId) {
    const map = readMap(INVITES_KEY);
    return map[roomId] ?? null;
}
