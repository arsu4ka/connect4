import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
export function GameBoard({ board, disabled, onDrop, hoveredColumn, onHoverColumn, winLine }) {
    return (_jsxs("div", { className: "relative rounded-3xl bg-board p-4 shadow-neon", children: [winLine ? (_jsx("div", { className: "pointer-events-none absolute inset-0 rounded-3xl ring-4 ring-emerald-300/70 ring-offset-2 ring-offset-board" })) : null, _jsx("div", { className: "grid grid-cols-7 gap-2", children: Array.from({ length: 7 }).map((_, col) => (_jsx("button", { type: "button", disabled: disabled, onMouseEnter: () => onHoverColumn(col), onMouseLeave: () => onHoverColumn(null), onClick: () => onDrop?.(col), className: `relative rounded-xl p-1 transition ${hoveredColumn === col ? 'bg-white/20' : 'bg-white/5'} ${disabled ? 'cursor-default' : 'cursor-pointer'}`, children: _jsx("div", { className: "grid gap-2", children: board.map((row, rowIdx) => {
                            const cell = row[col];
                            return (_jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/45", children: cell ? (_jsx(motion.div, { initial: { y: -200, opacity: 0.1 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring', stiffness: 280, damping: 20 }, className: `h-10 w-10 rounded-full shadow-lg ${cell === 'red' ? 'bg-p1' : 'bg-p2'}` })) : null }, `${rowIdx}-${col}`));
                        }) }) }, `column-${col}`))) })] }));
}
