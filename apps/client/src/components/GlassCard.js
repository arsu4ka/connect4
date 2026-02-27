import { jsx as _jsx } from "react/jsx-runtime";
export function GlassCard({ children, className = '' }) {
    return (_jsx("div", { className: `rounded-3xl border border-white/30 bg-white/15 p-5 shadow-soft backdrop-blur-xl ${className}`, children: children }));
}
