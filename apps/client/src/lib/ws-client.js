import { wsBaseUrl } from './config';
export class RoomSocket {
    handlers;
    ws;
    constructor(roomId, handlers) {
        this.handlers = handlers;
        this.ws = new WebSocket(`${wsBaseUrl()}/ws/rooms/${roomId}`);
        this.ws.addEventListener('open', () => this.handlers.onOpen?.());
        this.ws.addEventListener('close', () => this.handlers.onClose?.());
        this.ws.addEventListener('error', () => this.handlers.onError?.());
        this.ws.addEventListener('message', (msg) => {
            try {
                const parsed = JSON.parse(msg.data);
                this.handlers.onEvent(parsed);
            }
            catch {
                // ignore malformed event
            }
        });
    }
    send(event) {
        if (this.ws.readyState !== WebSocket.OPEN)
            return;
        this.ws.send(JSON.stringify(event));
    }
    close() {
        this.ws.close();
    }
}
