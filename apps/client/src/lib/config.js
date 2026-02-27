export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
export function wsBaseUrl() {
    if (API_BASE_URL.startsWith('https://'))
        return API_BASE_URL.replace('https://', 'wss://');
    if (API_BASE_URL.startsWith('http://'))
        return API_BASE_URL.replace('http://', 'ws://');
    return API_BASE_URL;
}
