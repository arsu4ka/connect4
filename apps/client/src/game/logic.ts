import type { CellValue, DiscColor, WinLine } from '@connect4/shared';

export const ROWS = 6;
export const COLS = 7;

export function emptyBoard(): CellValue[][] {
  return Array.from({ length: ROWS }, () => Array<CellValue>(COLS).fill(null));
}

export function oppositeColor(color: DiscColor): DiscColor {
  return color === 'red' ? 'yellow' : 'red';
}

export function validColumns(board: CellValue[][]): number[] {
  const result: number[] = [];
  for (let col = 0; col < COLS; col += 1) {
    if (board[0][col] === null) result.push(col);
  }
  return result;
}

export function applyMove(
  board: CellValue[][],
  col: number,
  color: DiscColor
): { board: CellValue[][]; row: number; col: number } | null {
  if (col < 0 || col >= COLS) return null;

  let row = -1;
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (board[r][col] === null) {
      row = r;
      break;
    }
  }

  if (row === -1) return null;

  const next = board.map((line) => [...line]);
  next[row][col] = color;
  return { board: next, row, col };
}

export function isDraw(board: CellValue[][]): boolean {
  return validColumns(board).length === 0;
}

export function findWinLine(
  board: CellValue[][],
  row: number,
  col: number,
  color: DiscColor
): WinLine | null {
  const dirs: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of dirs) {
    const points: Array<[number, number]> = [];
    for (let k = -3; k <= 3; k += 1) {
      const r = row + dr * k;
      const c = col + dc * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (board[r][c] === color) {
        points.push([r, c]);
      } else {
        points.length = 0;
      }
      if (points.length >= 4) {
        return {
          from: points[0],
          to: points[points.length - 1]
        };
      }
    }
  }

  return null;
}
