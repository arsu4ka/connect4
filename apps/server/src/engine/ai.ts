import type { CellValue, DiscColor } from '@connect4/shared';
import { BOARD_COLS } from './constants';
import { applyMove, findWinLine, getValidColumns, oppositeColor } from './logic';

export type Difficulty = 'easy' | 'medium' | 'hard';

const difficultyDepth: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6
};

const difficultyRandomness: Record<Difficulty, number> = {
  easy: 0.4,
  medium: 0.15,
  hard: 0
};

function scoreWindow(window: Array<CellValue>, aiColor: DiscColor): number {
  const opponent = oppositeColor(aiColor);
  const aiCount = window.filter((v) => v === aiColor).length;
  const oppCount = window.filter((v) => v === opponent).length;
  const emptyCount = window.filter((v) => v === null).length;

  if (aiCount === 4) return 10_000;
  if (aiCount === 3 && emptyCount === 1) return 80;
  if (aiCount === 2 && emptyCount === 2) return 20;

  if (oppCount === 3 && emptyCount === 1) return -100;
  if (oppCount === 4) return -10_000;

  return 0;
}

function evaluateBoard(board: CellValue[][], aiColor: DiscColor): number {
  let score = 0;

  const centerCol = Math.floor(BOARD_COLS / 2);
  const centerCount = board.reduce((acc, row) => (row[centerCol] === aiColor ? acc + 1 : acc), 0);
  score += centerCount * 6;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < BOARD_COLS - 3; col += 1) {
      score += scoreWindow(
        [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]],
        aiColor
      );
    }
  }

  for (let row = 0; row < board.length - 3; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      score += scoreWindow(
        [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]],
        aiColor
      );
    }
  }

  for (let row = 0; row < board.length - 3; row += 1) {
    for (let col = 0; col < BOARD_COLS - 3; col += 1) {
      score += scoreWindow(
        [
          board[row][col],
          board[row + 1][col + 1],
          board[row + 2][col + 2],
          board[row + 3][col + 3]
        ],
        aiColor
      );
    }
  }

  for (let row = 0; row < board.length - 3; row += 1) {
    for (let col = 3; col < BOARD_COLS; col += 1) {
      score += scoreWindow(
        [
          board[row][col],
          board[row + 1][col - 1],
          board[row + 2][col - 2],
          board[row + 3][col - 3]
        ],
        aiColor
      );
    }
  }

  return score;
}

function isTerminal(board: CellValue[][]): boolean {
  const valid = getValidColumns(board);
  return valid.length === 0;
}

function checkAnyWin(board: CellValue[][], color: DiscColor): boolean {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[0].length; col += 1) {
      if (board[row][col] !== color) continue;
      if (findWinLine(board, row, col, color)) return true;
    }
  }
  return false;
}

function minimax(
  board: CellValue[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: DiscColor
): { score: number; column: number | null } {
  const validColumns = getValidColumns(board);
  const opponent = oppositeColor(aiColor);

  const aiWin = checkAnyWin(board, aiColor);
  const oppWin = checkAnyWin(board, opponent);

  if (depth === 0 || aiWin || oppWin || isTerminal(board)) {
    if (aiWin) return { score: 1_000_000 + depth, column: null };
    if (oppWin) return { score: -1_000_000 - depth, column: null };
    return { score: evaluateBoard(board, aiColor), column: null };
  }

  const ordered = [...validColumns].sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));

  if (maximizing) {
    let value = -Infinity;
    let bestColumn: number | null = ordered[0] ?? null;

    for (const col of ordered) {
      const moved = applyMove(board, col, aiColor);
      if (!moved) continue;
      const result = minimax(moved.board, depth - 1, alpha, beta, false, aiColor);
      if (result.score > value) {
        value = result.score;
        bestColumn = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }

    return { score: value, column: bestColumn };
  }

  let value = Infinity;
  let bestColumn: number | null = ordered[0] ?? null;

  for (const col of ordered) {
    const moved = applyMove(board, col, opponent);
    if (!moved) continue;
    const result = minimax(moved.board, depth - 1, alpha, beta, true, aiColor);
    if (result.score < value) {
      value = result.score;
      bestColumn = col;
    }
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }

  return { score: value, column: bestColumn };
}

export function pickAIMove(
  board: CellValue[][],
  aiColor: DiscColor,
  difficulty: Difficulty
): number {
  const valid = getValidColumns(board);
  if (valid.length === 0) return -1;

  if (Math.random() < difficultyRandomness[difficulty]) {
    return valid[Math.floor(Math.random() * valid.length)];
  }

  for (const col of valid) {
    const moved = applyMove(board, col, aiColor);
    if (!moved) continue;
    if (findWinLine(moved.board, moved.row, moved.col, aiColor)) return col;
  }

  const opponent = oppositeColor(aiColor);
  for (const col of valid) {
    const moved = applyMove(board, col, opponent);
    if (!moved) continue;
    if (findWinLine(moved.board, moved.row, moved.col, opponent)) return col;
  }

  const { column } = minimax(
    board,
    difficultyDepth[difficulty],
    -Infinity,
    Infinity,
    true,
    aiColor
  );
  return column ?? valid[0];
}
