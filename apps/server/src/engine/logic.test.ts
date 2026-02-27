import { describe, expect, it } from 'vitest';
import { applyMove, createEmptyBoard, findWinLine, getValidColumns, isDraw } from './logic';

describe('engine logic', () => {
  it('applies move to lowest free row', () => {
    const board = createEmptyBoard();
    const first = applyMove(board, 0, 'red');
    expect(first).not.toBeNull();
    expect(first?.row).toBe(5);

    const second = applyMove(first!.board, 0, 'yellow');
    expect(second?.row).toBe(4);
  });

  it('detects horizontal win', () => {
    let board = createEmptyBoard();
    for (let col = 0; col < 4; col += 1) {
      board = applyMove(board, col, 'red')!.board;
    }
    const last = applyMove(board, 4, 'yellow')!;
    const line = findWinLine(last.board, 5, 3, 'red');
    expect(line).toEqual({ from: [5, 0], to: [5, 3] });
  });

  it('detects vertical win', () => {
    let board = createEmptyBoard();
    let lastRow = 0;
    for (let i = 0; i < 4; i += 1) {
      const moved = applyMove(board, 2, 'yellow')!;
      board = moved.board;
      lastRow = moved.row;
    }
    const line = findWinLine(board, lastRow, 2, 'yellow');
    expect(line).toEqual({ from: [2, 2], to: [5, 2] });
  });

  it('detects draw when board is full', () => {
    let board = createEmptyBoard();
    const colors = ['red', 'yellow'] as const;
    for (let col = 0; col < 7; col += 1) {
      for (let i = 0; i < 6; i += 1) {
        board = applyMove(board, col, colors[(i + col) % 2])!.board;
      }
    }

    expect(getValidColumns(board)).toHaveLength(0);
    expect(isDraw(board)).toBe(true);
  });
});
