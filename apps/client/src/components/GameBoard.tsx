import { motion } from 'framer-motion';
import type { CellValue, DiscColor, WinLine } from '@connect4/shared';

export function GameBoard({
  board,
  disabled,
  onDrop,
  hoveredColumn,
  onHoverColumn,
  winLine,
  previewColor
}: {
  board: CellValue[][];
  disabled?: boolean;
  onDrop?: (column: number) => void;
  hoveredColumn: number | null;
  onHoverColumn: (column: number | null) => void;
  winLine?: WinLine | null;
  previewColor?: DiscColor | null;
}) {
  const previewRow = hoveredColumn === null ? null : findDropRow(board, hoveredColumn);

  return (
    <div className="c4-board-shell">
      <div className="c4-top-rail" />
      {winLine ? <div className="c4-win-glow" /> : null}

      <div
        className="c4-grid"
        role="grid"
        aria-label="Connect4 board"
        onMouseLeave={() => onHoverColumn(null)}
      >
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isWinCell = isCellInWinLine(rowIdx, colIdx, winLine);
            const isHoveredColumn = !disabled && hoveredColumn === colIdx;
            const showGhost =
              Boolean(previewColor) &&
              !disabled &&
              hoveredColumn === colIdx &&
              previewRow === rowIdx &&
              !cell;

            return (
              <button
                type="button"
                className={`c4-cell ${isHoveredColumn ? 'is-hovered-column' : ''}`}
                role="gridcell"
                key={`${rowIdx}-${colIdx}`}
                disabled={disabled}
                onMouseEnter={() => onHoverColumn(colIdx)}
                onFocus={() => onHoverColumn(colIdx)}
                onBlur={() => onHoverColumn(null)}
                onClick={() => onDrop?.(colIdx)}
                aria-label={`Drop in column ${colIdx + 1}`}
              >
                <div
                  className={`c4-hole ${isWinCell ? 'is-win' : ''} ${isHoveredColumn ? 'is-hovered-column' : ''}`}
                >
                  {showGhost ? (
                    <motion.div
                      key={`ghost-${rowIdx}-${colIdx}-${previewColor}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 0.11, scale: 1 }}
                      transition={{ duration: 0.14 }}
                      className={`c4-disc is-ghost ${previewColor === 'red' ? 'is-red' : 'is-yellow'}`}
                    />
                  ) : null}
                  {cell ? (
                    <motion.div
                      key={`${rowIdx}-${colIdx}-${cell}`}
                      initial={{ y: -420, opacity: 0.18, scale: 0.92 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 19, stiffness: 235 }}
                      className={`c4-disc ${cell === 'red' ? 'is-red' : 'is-yellow'}`}
                    />
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function isCellInWinLine(row: number, col: number, winLine?: WinLine | null): boolean {
  if (!winLine) return false;

  const [fromRow, fromCol] = winLine.from;
  const [toRow, toCol] = winLine.to;
  const stepRow = Math.sign(toRow - fromRow);
  const stepCol = Math.sign(toCol - fromCol);

  let curRow = fromRow;
  let curCol = fromCol;

  while (true) {
    if (curRow === row && curCol === col) return true;
    if (curRow === toRow && curCol === toCol) return false;
    curRow += stepRow;
    curCol += stepCol;
  }
}

function findDropRow(board: CellValue[][], column: number): number | null {
  for (let row = board.length - 1; row >= 0; row -= 1) {
    if (!board[row][column]) return row;
  }

  return null;
}
