import { describe, expect, it } from 'vitest';
import { pickAIMove } from './ai';
import { applyMove, createEmptyBoard } from './logic';

describe('AI move selection', () => {
  it('returns valid column', () => {
    const board = createEmptyBoard();
    const col = pickAIMove(board, 'red', 'medium');
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThanOrEqual(6);
  });

  it('blocks direct opponent threat on hard', () => {
    let board = createEmptyBoard();
    board = applyMove(board, 0, 'yellow')!.board;
    board = applyMove(board, 1, 'yellow')!.board;
    board = applyMove(board, 2, 'yellow')!.board;

    const col = pickAIMove(board, 'red', 'hard');
    expect(col).toBe(3);
  });
});
