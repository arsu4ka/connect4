import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    const [hostName, setHostName] = useState('Host');
    const [error, setError] = useState(null);
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось войти в игру');
        }
        finally {
            setJoining(false);
        }
    }
    return (_jsx(PageShell, { children: _jsxs(GlassCard, { className: "mx-auto max-w-xl space-y-4", children: [_jsx("h1", { className: "font-display text-4xl", children: "\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A \u0438\u0433\u0440\u0435" }), loading ? _jsx("p", { children: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0441\u0441\u044B\u043B\u043A\u0443..." }) : null, !loading && !valid ? _jsx("p", { className: "rounded-xl bg-red-500/20 p-3", children: "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u0430 \u0438\u043B\u0438 \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0430." }) : null, !loading && valid ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["\u0412\u0430\u0441 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u0435\u0442: ", hostName] }), _jsx("input", { value: displayName, onChange: (e) => setDisplayName(e.target.value), placeholder: "\u0412\u0430\u0448 \u043D\u0438\u043A", className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2" }), error ? _jsx("p", { className: "text-red-200", children: error }) : null, _jsx("button", { onClick: onJoin, disabled: joining, className: "rounded-xl bg-p2 px-4 py-2 font-semibold text-slate-900", children: joining ? 'Подключаем...' : 'Войти в матч' })] })) : null, _jsx(Link, { to: "/", className: "block text-sm text-slate-100/80 underline", children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }) }));
}
