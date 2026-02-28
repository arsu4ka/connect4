import type { ClientEvent, ServerEvent } from '@connect4/shared';
import { wsBaseUrl } from './config';

export class RoomSocket {
  private ws: WebSocket;

  constructor(
    roomId: string,
    private handlers: {
      onEvent: (event: ServerEvent) => void;
      onOpen?: () => void;
      onClose?: () => void;
      onError?: () => void;
    },
    options?: {
      playerToken?: string;
    }
  ) {
    const tokenQuery = options?.playerToken
      ? `?playerToken=${encodeURIComponent(options.playerToken)}`
      : '';
    this.ws = new WebSocket(`${wsBaseUrl()}/ws/rooms/${encodeURIComponent(roomId)}${tokenQuery}`);

    this.ws.addEventListener('open', () => this.handlers.onOpen?.());
    this.ws.addEventListener('close', () => this.handlers.onClose?.());
    this.ws.addEventListener('error', () => this.handlers.onError?.());
    this.ws.addEventListener('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.data as string) as ServerEvent;
        this.handlers.onEvent(parsed);
      } catch {
        // ignore malformed event
      }
    });
  }

  send(event: ClientEvent): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(event));
  }

  close(): void {
    this.ws.close();
  }
}
