import { motion } from 'framer-motion';
import type { CellValue, WinLine } from '@connect4/shared';

export function GameBoard({
  board,
  disabled,
  onDrop,
  hoveredColumn,
  onHoverColumn,
  winLine
}: {
  board: CellValue[][];
  disabled?: boolean;
  onDrop?: (column: number) => void;
  hoveredColumn: number | null;
  onHoverColumn: (column: number | null) => void;
  winLine?: WinLine | null;
}) {
  return (
    <div className="relative rounded-3xl bg-board p-4 shadow-neon">
      {winLine ? (
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-4 ring-emerald-300/70 ring-offset-2 ring-offset-board" />
      ) : null}

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, col) => (
          <button
            key={`column-${col}`}
            type="button"
            disabled={disabled}
            onMouseEnter={() => onHoverColumn(col)}
            onMouseLeave={() => onHoverColumn(null)}
            onClick={() => onDrop?.(col)}
            className={`relative rounded-xl p-1 transition ${hoveredColumn === col ? 'bg-white/20' : 'bg-white/5'} ${
              disabled ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <div className="grid gap-2">
              {board.map((row, rowIdx) => {
                const cell = row[col];
                return (
                  <div key={`${rowIdx}-${col}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/45">
                    {cell ? (
                      <motion.div
                        initial={{ y: -200, opacity: 0.1 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                        className={`h-10 w-10 rounded-full shadow-lg ${
                          cell === 'red' ? 'bg-p1' : 'bg-p2'
                        }`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
