export const ROWS = 6;
export const COLS = 7;
export function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}
export function oppositeColor(color) {
    return color === 'red' ? 'yellow' : 'red';
}
export function validColumns(board) {
    const result = [];
    for (let col = 0; col < COLS; col += 1) {
        if (board[0][col] === null)
            result.push(col);
    }
    return result;
}
export function applyMove(board, col, color) {
    if (col < 0 || col >= COLS)
        return null;
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (board[r][col] === null) {
            row = r;
            break;
        }
    }
    if (row === -1)
        return null;
    const next = board.map((line) => [...line]);
    next[row][col] = color;
    return { board: next, row, col };
}
export function isDraw(board) {
    return validColumns(board).length === 0;
}
export function findWinLine(board, row, col, color) {
    const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
    ];
    for (const [dr, dc] of dirs) {
        const points = [];
        for (let k = -3; k <= 3; k += 1) {
            const r = row + dr * k;
            const c = col + dc * k;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS)
                continue;
            if (board[r][c] === color) {
                points.push([r, c]);
            }
            else {
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
