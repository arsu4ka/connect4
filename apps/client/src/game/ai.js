import { applyMove, findWinLine, oppositeColor, validColumns } from './logic';
function scoreWindow(window, ai) {
    const opp = oppositeColor(ai);
    const aiCount = window.filter((v) => v === ai).length;
    const oppCount = window.filter((v) => v === opp).length;
    const emptyCount = window.filter((v) => v === null).length;
    if (aiCount === 4)
        return 1000;
    if (aiCount === 3 && emptyCount === 1)
        return 50;
    if (oppCount === 3 && emptyCount === 1)
        return -80;
    return 0;
}
function evaluate(board, ai) {
    let score = 0;
    for (let r = 0; r < 6; r += 1) {
        for (let c = 0; c < 4; c += 1) {
            score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], ai);
        }
    }
    for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 7; c += 1) {
            score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], ai);
        }
    }
    return score;
}
function hasWin(board, color) {
    for (let r = 0; r < 6; r += 1) {
        for (let c = 0; c < 7; c += 1) {
            if (board[r][c] === color && findWinLine(board, r, c, color))
                return true;
        }
    }
    return false;
}
function minimax(board, depth, alpha, beta, maximizing, ai) {
    const valid = validColumns(board);
    const opp = oppositeColor(ai);
    if (hasWin(board, ai))
        return { score: 99999 + depth, col: valid[0] ?? 0 };
    if (hasWin(board, opp))
        return { score: -99999 - depth, col: valid[0] ?? 0 };
    if (depth === 0 || valid.length === 0)
        return { score: evaluate(board, ai), col: valid[0] ?? 0 };
    if (maximizing) {
        let best = -Infinity;
        let bestCol = valid[0];
        for (const col of valid) {
            const moved = applyMove(board, col, ai);
            if (!moved)
                continue;
            const score = minimax(moved.board, depth - 1, alpha, beta, false, ai).score;
            if (score > best) {
                best = score;
                bestCol = col;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta)
                break;
        }
        return { score: best, col: bestCol };
    }
    let best = Infinity;
    let bestCol = valid[0];
    for (const col of valid) {
        const moved = applyMove(board, col, opp);
        if (!moved)
            continue;
        const score = minimax(moved.board, depth - 1, alpha, beta, true, ai).score;
        if (score < best) {
            best = score;
            bestCol = col;
        }
        beta = Math.min(beta, score);
        if (alpha >= beta)
            break;
    }
    return { score: best, col: bestCol };
}
export function pickAIMove(board, aiColor, difficulty) {
    const valid = validColumns(board);
    if (valid.length === 0)
        return -1;
    for (const col of valid) {
        const moved = applyMove(board, col, aiColor);
        if (moved && findWinLine(moved.board, moved.row, moved.col, aiColor))
            return col;
    }
    const opp = oppositeColor(aiColor);
    for (const col of valid) {
        const moved = applyMove(board, col, opp);
        if (moved && findWinLine(moved.board, moved.row, moved.col, opp))
            return col;
    }
    const params = {
        easy: { depth: 2, random: 0.4 },
        medium: { depth: 4, random: 0.15 },
        hard: { depth: 6, random: 0 }
    }[difficulty];
    if (Math.random() < params.random) {
        return valid[Math.floor(Math.random() * valid.length)];
    }
    return minimax(board, params.depth, -Infinity, Infinity, true, aiColor).col;
}
