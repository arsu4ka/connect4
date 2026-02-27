import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiscColor, GameState, ServerEvent } from '@connect4/shared';
import { Link, useParams } from 'react-router-dom';
import { GameBoard } from '../components/GameBoard';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';
import { TimerPanel } from '../components/TimerPanel';
import { getInviteUrl, getPlayerColor, getPlayerToken } from '../lib/storage';
import { RoomSocket } from '../lib/ws-client';

export function OnlineGamePage() {
  const { roomId = '' } = useParams();

  const [state, setState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const socketRef = useRef<RoomSocket | null>(null);

  const playerToken = roomId ? getPlayerToken(roomId) : null;
  const myColor = roomId ? getPlayerColor(roomId) : null;
  const inviteUrl = roomId ? getInviteUrl(roomId) : null;

  useEffect(() => {
    if (!roomId || !playerToken) return;

    const socket = new RoomSocket(roomId, {
      onOpen: () => {
        setConnected(true);
        socket.send({ type: 'join_room', playerToken });
      },
      onClose: () => setConnected(false),
      onError: () => setConnected(false),
      onEvent: (event: ServerEvent) => {
        if (event.type === 'error_event') {
          setError(event.message);
          return;
        }

        if ('state' in event) {
          setState(event.state);
        }
      }
    });
    socketRef.current = socket;

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [playerToken, roomId]);

  const statusText = useMemo(() => {
    if (!state) return 'Ожидание состояния игры...';
    if (state.status === 'waiting') return 'Ожидание второго игрока';
    if (state.status === 'active') {
      if (state.paused) return 'Игра на паузе: ожидаем переподключение';
      return state.currentTurnColor === myColor ? 'Ваш ход' : 'Ход соперника';
    }
    if (!state.winnerColor) return 'Ничья';
    return state.winnerColor === myColor ? 'Вы победили' : 'Вы проиграли';
  }, [myColor, state]);

  if (!playerToken || !myColor) {
    return (
      <PageShell>
        <GlassCard className="mx-auto max-w-xl space-y-4">
          <h1 className="font-display text-3xl">Нет доступа к матчу</h1>
          <p>Токен игрока не найден. Зайдите в матч через создание игры или invite-ссылку.</p>
          <Link className="underline" to="/online/create">
            Создать игру
          </Link>
        </GlassCard>
      </PageShell>
    );
  }

  function send(event: { type: 'make_move'; column: number } | { type: 'request_rematch' }) {
    socketRef.current?.send(event);
  }

  return (
    <PageShell>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <GlassCard className="space-y-4">
          <h1 className="font-display text-3xl">Онлайн матч</h1>
          <p>Статус соединения: {connected ? 'online' : 'offline'}</p>
          <p className="font-semibold">{statusText}</p>

          <div className="rounded-2xl bg-black/25 p-3 text-sm">
            <p>Ваш цвет: {myColor.toUpperCase()}</p>
            {state?.disconnectDeadlineAt ? <p>Таймаут дисконнекта активен</p> : null}
          </div>

          <TimerPanel activeColor={state?.currentTurnColor ?? myColor} timeLeftMs={state?.timeLeftMs} />

          {inviteUrl && state?.status === 'waiting' ? (
            <button
              type="button"
              className="rounded-xl border border-white/40 px-3 py-2 text-sm"
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
            >
              Скопировать invite-ссылку
            </button>
          ) : null}

          {state?.status === 'finished' ? (
            <button
              type="button"
              className="rounded-xl bg-p2 px-3 py-2 font-semibold text-slate-900"
              onClick={() => send({ type: 'request_rematch' })}
            >
              Реванш
            </button>
          ) : null}

          {error ? <p className="rounded-xl bg-red-500/20 p-2 text-sm">{error}</p> : null}
        </GlassCard>

        <GlassCard>
          <GameBoard
            board={state?.board ?? Array.from({ length: 6 }, () => Array(7).fill(null as DiscColor | null))}
            disabled={!state || state.status !== 'active' || state.currentTurnColor !== myColor || Boolean(state.paused)}
            hoveredColumn={hoveredColumn}
            onHoverColumn={setHoveredColumn}
            winLine={state?.winLine}
            onDrop={(column) => send({ type: 'make_move', column })}
          />
        </GlassCard>
      </div>
    </PageShell>
  );
}
