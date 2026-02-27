import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameBoard } from '../components/GameBoard';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';
import { TimerPanel } from '../components/TimerPanel';
import { getInviteUrl, getPlayerColor, getPlayerToken } from '../lib/storage';
import { RoomSocket } from '../lib/ws-client';
export function OnlineGamePage() {
    const { roomId = '' } = useParams();
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredColumn, setHoveredColumn] = useState(null);
    const socketRef = useRef(null);
    const playerToken = roomId ? getPlayerToken(roomId) : null;
    const myColor = roomId ? getPlayerColor(roomId) : null;
    const inviteUrl = roomId ? getInviteUrl(roomId) : null;
    useEffect(() => {
        if (!roomId || !playerToken)
            return;
        const socket = new RoomSocket(roomId, {
            onOpen: () => {
                setConnected(true);
                socket.send({ type: 'join_room', playerToken });
            },
            onClose: () => setConnected(false),
            onError: () => setConnected(false),
            onEvent: (event) => {
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
        if (!state)
            return 'Ожидание состояния игры...';
        if (state.status === 'waiting')
            return 'Ожидание второго игрока';
        if (state.status === 'active') {
            if (state.paused)
                return 'Игра на паузе: ожидаем переподключение';
            return state.currentTurnColor === myColor ? 'Ваш ход' : 'Ход соперника';
        }
        if (!state.winnerColor)
            return 'Ничья';
        return state.winnerColor === myColor ? 'Вы победили' : 'Вы проиграли';
    }, [myColor, state]);
    if (!playerToken || !myColor) {
        return (_jsx(PageShell, { children: _jsxs(GlassCard, { className: "mx-auto max-w-xl space-y-4", children: [_jsx("h1", { className: "font-display text-3xl", children: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043C\u0430\u0442\u0447\u0443" }), _jsx("p", { children: "\u0422\u043E\u043A\u0435\u043D \u0438\u0433\u0440\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0417\u0430\u0439\u0434\u0438\u0442\u0435 \u0432 \u043C\u0430\u0442\u0447 \u0447\u0435\u0440\u0435\u0437 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438\u0433\u0440\u044B \u0438\u043B\u0438 invite-\u0441\u0441\u044B\u043B\u043A\u0443." }), _jsx(Link, { className: "underline", to: "/online/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" })] }) }));
    }
    function send(event) {
        socketRef.current?.send(event);
    }
    return (_jsx(PageShell, { children: _jsxs("div", { className: "grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]", children: [_jsxs(GlassCard, { className: "space-y-4", children: [_jsx("h1", { className: "font-display text-3xl", children: "\u041E\u043D\u043B\u0430\u0439\u043D \u043C\u0430\u0442\u0447" }), _jsxs("p", { children: ["\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F: ", connected ? 'online' : 'offline'] }), _jsx("p", { className: "font-semibold", children: statusText }), _jsxs("div", { className: "rounded-2xl bg-black/25 p-3 text-sm", children: [_jsxs("p", { children: ["\u0412\u0430\u0448 \u0446\u0432\u0435\u0442: ", myColor.toUpperCase()] }), state?.disconnectDeadlineAt ? _jsx("p", { children: "\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u0434\u0438\u0441\u043A\u043E\u043D\u043D\u0435\u043A\u0442\u0430 \u0430\u043A\u0442\u0438\u0432\u0435\u043D" }) : null] }), _jsx(TimerPanel, { activeColor: state?.currentTurnColor ?? myColor, timeLeftMs: state?.timeLeftMs }), inviteUrl && state?.status === 'waiting' ? (_jsx("button", { type: "button", className: "rounded-xl border border-white/40 px-3 py-2 text-sm", onClick: () => navigator.clipboard.writeText(inviteUrl), children: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C invite-\u0441\u0441\u044B\u043B\u043A\u0443" })) : null, state?.status === 'finished' ? (_jsx("button", { type: "button", className: "rounded-xl bg-p2 px-3 py-2 font-semibold text-slate-900", onClick: () => send({ type: 'request_rematch' }), children: "\u0420\u0435\u0432\u0430\u043D\u0448" })) : null, error ? _jsx("p", { className: "rounded-xl bg-red-500/20 p-2 text-sm", children: error }) : null] }), _jsx(GlassCard, { children: _jsx(GameBoard, { board: state?.board ?? Array.from({ length: 6 }, () => Array(7).fill(null)), disabled: !state || state.status !== 'active' || state.currentTurnColor !== myColor || Boolean(state.paused), hoveredColumn: hoveredColumn, onHoverColumn: setHoveredColumn, winLine: state?.winLine, onDrop: (column) => send({ type: 'make_move', column }) }) })] }) }));
}
