import type { CellValue, DiscColor, WinLine } from '@connect4/shared';
import { BOARD_COLS, BOARD_ROWS, CONNECT_TARGET } from './constants';

export function createEmptyBoard(): CellValue[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array<CellValue>(BOARD_COLS).fill(null));
}

export function cloneBoard(board: CellValue[][]): CellValue[][] {
  return board.map((row) => [...row]);
}

export function getValidColumns(board: CellValue[][]): number[] {
  const valid: number[] = [];
  for (let col = 0; col < BOARD_COLS; col += 1) {
    if (board[0][col] === null) valid.push(col);
  }
  return valid;
}

export function findAvailableRow(board: CellValue[][], col: number): number {
  if (col < 0 || col >= BOARD_COLS) return -1;
  for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
    if (board[row][col] === null) return row;
  }
  return -1;
}

export function applyMove(
  board: CellValue[][],
  col: number,
  color: DiscColor
): { board: CellValue[][]; row: number; col: number } | null {
  const row = findAvailableRow(board, col);
  if (row === -1) return null;
  const next = cloneBoard(board);
  next[row][col] = color;
  return { board: next, row, col };
}

export function oppositeColor(color: DiscColor): DiscColor {
  return color === 'red' ? 'yellow' : 'red';
}

function scanDirection(
  board: CellValue[][],
  row: number,
  col: number,
  color: DiscColor,
  dr: number,
  dc: number
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  let r = row;
  let c = col;

  while (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS && board[r][c] === color) {
    cells.push([r, c]);
    r += dr;
    c += dc;
  }

  return cells;
}

export function findWinLine(
  board: CellValue[][],
  lastRow: number,
  lastCol: number,
  color: DiscColor
): WinLine | null {
  const directions: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const positive = scanDirection(board, lastRow, lastCol, color, dr, dc);
    const negative = scanDirection(board, lastRow - dr, lastCol - dc, color, -dr, -dc);
    const fullLine = [...negative.reverse(), ...positive];

    if (fullLine.length >= CONNECT_TARGET) {
      const start = fullLine[0];
      const end = fullLine[fullLine.length - 1];
      return { from: [start[0], start[1]], to: [end[0], end[1]] };
    }
  }

  return null;
}

export function isDraw(board: CellValue[][]): boolean {
  return getValidColumns(board).length === 0;
}
