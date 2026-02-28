import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PreferredColor, TimeControl } from '@connect4/shared';
import { createRoom } from '../lib/api';
import { saveInviteUrl, savePlayerColor, savePlayerToken } from '../lib/storage';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';

const timePresets = [60, 180, 300, 600];

export function OnlineCreatePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [preferredColor, setPreferredColor] = useState<PreferredColor>('random');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const timeControl: TimeControl = timerEnabled
      ? { type: 'clock', secondsPerPlayer: seconds }
      : { type: 'none' };

    try {
      const room = await createRoom({
        preferredColor,
        displayName: displayName.trim() || undefined,
        timeControl
      });

      savePlayerToken(room.roomId, room.playerToken);
      savePlayerColor(room.roomId, room.yourColor);
      saveInviteUrl(room.roomId, room.inviteUrl);

      navigate(`/online/game/${room.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать комнату');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <GlassCard className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-sm text-slate-100/80">Онлайн игра</p>
          <h1 className="font-display text-4xl">Создание матча</h1>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm">Ваш ник</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Host"
              className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Цвет</span>
            <select
              value={preferredColor}
              onChange={(e) => setPreferredColor(e.target.value as PreferredColor)}
              className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white"
            >
              <option value="random">Random</option>
              <option value="red">Red</option>
              <option value="yellow">Yellow</option>
            </select>
          </label>

          <div className="space-y-2 rounded-2xl border border-white/25 p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
              />
              <span>Контроль времени</span>
            </label>

            {timerEnabled ? (
              <select
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white"
              >
                {timePresets.map((value) => (
                  <option key={value} value={value}>
                    {Math.floor(value / 60)} мин на игрока
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl bg-red-500/20 p-2 text-sm text-red-100">{error}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-p2 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
            >
              {loading ? 'Создаем...' : 'Создать матч'}
            </button>
            <Link to="/" className="rounded-xl border border-white/35 px-4 py-2 text-sm">
              На главную
            </Link>
          </div>
        </form>
      </GlassCard>
    </PageShell>
  );
}
