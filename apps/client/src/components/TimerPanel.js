import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function msToClock(ms) {
    if (ms === undefined)
        return '--:--';
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (total % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}
export function TimerPanel({ activeColor, timeLeftMs }) {
    if (!timeLeftMs) {
        return _jsx("p", { className: "text-sm text-slate-100/80", children: "\u0411\u0435\u0437 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u0438" });
    }
    return (_jsxs("div", { className: "grid grid-cols-2 gap-3 text-white", children: [_jsxs("div", { className: `rounded-2xl p-3 ${activeColor === 'red' ? 'bg-p1/90' : 'bg-white/20'}`, children: [_jsx("p", { className: "text-xs uppercase tracking-wide", children: "Red" }), _jsx("p", { className: "font-display text-2xl leading-none", children: msToClock(timeLeftMs.red) })] }), _jsxs("div", { className: `rounded-2xl p-3 ${activeColor === 'yellow' ? 'bg-p2/90 text-slate-900' : 'bg-white/20'}`, children: [_jsx("p", { className: "text-xs uppercase tracking-wide", children: "Yellow" }), _jsx("p", { className: "font-display text-2xl leading-none", children: msToClock(timeLeftMs.yellow) })] })] }));
}
