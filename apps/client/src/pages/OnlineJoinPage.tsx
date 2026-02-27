import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { joinInvite, previewInvite } from '../lib/api';
import { savePlayerColor, savePlayerToken } from '../lib/storage';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';

export function OnlineJoinPage() {
  const navigate = useNavigate();
  const { inviteToken = '' } = useParams();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [valid, setValid] = useState(false);
  const [hostName, setHostName] = useState<string>('Host');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    previewInvite(inviteToken)
      .then((res) => {
        setValid(Boolean(res.valid));
        setHostName(res.hostName ?? 'Host');
      })
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, [inviteToken]);

  async function onJoin() {
    setJoining(true);
    setError(null);
    try {
      const joined = await joinInvite(inviteToken, displayName.trim() || undefined);
      savePlayerToken(joined.roomId, joined.playerToken);
      savePlayerColor(joined.roomId, joined.yourColor);
      navigate(`/online/game/${joined.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти в игру');
    } finally {
      setJoining(false);
    }
  }

  return (
    <PageShell>
      <GlassCard className="mx-auto max-w-xl space-y-4">
        <h1 className="font-display text-4xl">Присоединиться к игре</h1>

        {loading ? <p>Проверяем ссылку...</p> : null}
        {!loading && !valid ? <p className="rounded-xl bg-red-500/20 p-3">Ссылка недействительна или уже использована.</p> : null}

        {!loading && valid ? (
          <>
            <p>Вас приглашает: {hostName}</p>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ваш ник"
              className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2"
            />
            {error ? <p className="text-red-200">{error}</p> : null}
            <button onClick={onJoin} disabled={joining} className="rounded-xl bg-p2 px-4 py-2 font-semibold text-slate-900">
              {joining ? 'Подключаем...' : 'Войти в матч'}
            </button>
          </>
        ) : null}

        <Link to="/" className="block text-sm text-slate-100/80 underline">
          На главную
        </Link>
      </GlassCard>
    </PageShell>
  );
}
