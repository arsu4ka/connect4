import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRoom } from '../lib/api';
import { saveInviteUrl, savePlayerColor, savePlayerToken } from '../lib/storage';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';
const timePresets = [60, 180, 300, 600];
export function OnlineCreatePage() {
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('');
    const [preferredColor, setPreferredColor] = useState('random');
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [seconds, setSeconds] = useState(300);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const timeControl = timerEnabled ? { type: 'clock', secondsPerPlayer: seconds } : { type: 'none' };
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось создать комнату');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx(PageShell, { children: _jsxs(GlassCard, { className: "mx-auto max-w-2xl space-y-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-100/80", children: "\u041E\u043D\u043B\u0430\u0439\u043D \u0438\u0433\u0440\u0430" }), _jsx("h1", { className: "font-display text-4xl", children: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043C\u0430\u0442\u0447\u0430" })] }), _jsxs("form", { className: "space-y-4", onSubmit: onSubmit, children: [_jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-sm", children: "\u0412\u0430\u0448 \u043D\u0438\u043A" }), _jsx("input", { value: displayName, onChange: (e) => setDisplayName(e.target.value), placeholder: "Host", className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white" })] }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-sm", children: "\u0426\u0432\u0435\u0442" }), _jsxs("select", { value: preferredColor, onChange: (e) => setPreferredColor(e.target.value), className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white", children: [_jsx("option", { value: "random", children: "Random" }), _jsx("option", { value: "red", children: "Red" }), _jsx("option", { value: "yellow", children: "Yellow" })] })] }), _jsxs("div", { className: "space-y-2 rounded-2xl border border-white/25 p-3", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: timerEnabled, onChange: (e) => setTimerEnabled(e.target.checked) }), _jsx("span", { children: "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u0432\u0440\u0435\u043C\u0435\u043D\u0438" })] }), timerEnabled ? (_jsx("select", { value: seconds, onChange: (e) => setSeconds(Number(e.target.value)), className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2 outline-none focus:border-white", children: timePresets.map((value) => (_jsxs("option", { value: value, children: [Math.floor(value / 60), " \u043C\u0438\u043D \u043D\u0430 \u0438\u0433\u0440\u043E\u043A\u0430"] }, value))) })) : null] }), error ? _jsx("p", { className: "rounded-xl bg-red-500/20 p-2 text-sm text-red-100", children: error }) : null, _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: loading, className: "rounded-xl bg-p2 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60", children: loading ? 'Создаем...' : 'Создать матч' }), _jsx(Link, { to: "/", className: "rounded-xl border border-white/35 px-4 py-2 text-sm", children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] })] })] }) }));
}
