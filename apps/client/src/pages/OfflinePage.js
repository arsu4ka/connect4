import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { pickAIMove } from '../game/ai';
import { applyMove, emptyBoard, findWinLine, isDraw, oppositeColor } from '../game/logic';
import { saveOfflineGame } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import { GameBoard } from '../components/GameBoard';
import { PageShell } from '../components/PageShell';
function pickPlayerColor(pref) {
    if (pref === 'random')
        return Math.random() < 0.5 ? 'red' : 'yellow';
    return pref;
}
function createGame(pref, forcedPlayerColor) {
    const playerColor = forcedPlayerColor ?? pickPlayerColor(pref);
    const botColor = oppositeColor(playerColor);
    return {
        board: emptyBoard(),
        currentTurnColor: 'red',
        status: 'active',
        winnerColor: null,
        winLine: null,
        playerColor,
        botColor,
        moveCount: 0,
        moves: []
    };
}
function applyTurn(state, col, color) {
    const moved = applyMove(state.board, col, color);
    if (!moved)
        return state;
    const moveCount = state.moveCount + 1;
    const moves = [
        ...state.moves,
        {
            moveNumber: moveCount,
            color,
            column: moved.col,
            row: moved.row,
            playedAt: new Date().toISOString()
        }
    ];
    const line = findWinLine(moved.board, moved.row, moved.col, color);
    if (line) {
        return {
            ...state,
            board: moved.board,
            moveCount,
            moves,
            status: 'finished',
            winnerColor: color,
            winLine: line
        };
    }
    if (isDraw(moved.board)) {
        return {
            ...state,
            board: moved.board,
            moveCount,
            moves,
            status: 'finished',
            winnerColor: null,
            winLine: null
        };
    }
    return {
        ...state,
        board: moved.board,
        moveCount,
        moves,
        currentTurnColor: oppositeColor(color)
    };
}
export function OfflinePage() {
    const [difficulty, setDifficulty] = useState('medium');
    const [preferredColor, setPreferredColor] = useState('random');
    const [game, setGame] = useState(() => createGame('random'));
    const [hoveredColumn, setHoveredColumn] = useState(null);
    const [botThinking, setBotThinking] = useState(false);
    const [savedGameId, setSavedGameId] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const summaryText = useMemo(() => {
        if (game.status === 'active')
            return 'Игра продолжается';
        if (!game.winnerColor)
            return 'Ничья';
        return game.winnerColor === game.playerColor ? 'Вы победили' : 'Компьютер победил';
    }, [game]);
    function startGame(forceColor) {
        setSavedGameId(null);
        setSaveError(null);
        setGame(createGame(preferredColor, forceColor));
    }
    function handleDrop(column) {
        setGame((prev) => {
            if (prev.status !== 'active')
                return prev;
            if (prev.currentTurnColor !== prev.playerColor)
                return prev;
            return applyTurn(prev, column, prev.playerColor);
        });
    }
    useEffect(() => {
        if (game.status !== 'active')
            return;
        if (game.currentTurnColor !== game.botColor)
            return;
        setBotThinking(true);
        const timer = window.setTimeout(() => {
            setGame((prev) => {
                if (prev.status !== 'active' || prev.currentTurnColor !== prev.botColor)
                    return prev;
                const col = pickAIMove(prev.board, prev.botColor, difficulty);
                if (col < 0)
                    return prev;
                return applyTurn(prev, col, prev.botColor);
            });
            setBotThinking(false);
        }, 360);
        return () => window.clearTimeout(timer);
    }, [game.status, game.currentTurnColor, game.botColor, difficulty]);
    useEffect(() => {
        if (game.status !== 'finished' || savedGameId || saveError)
            return;
        saveOfflineGame({
            displayName: 'Player',
            difficulty,
            preferredColor,
            playerColor: game.playerColor,
            timeControl: { type: 'none' },
            finishedReason: game.winnerColor ? 'win' : 'draw',
            winnerColor: game.winnerColor,
            moves: game.moves
        })
            .then((result) => setSavedGameId(result.gameId))
            .catch((error) => {
            setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить матч');
        });
    }, [difficulty, game, preferredColor, saveError, savedGameId]);
    return (_jsx(PageShell, { children: _jsxs("div", { className: "grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]", children: [_jsxs(GlassCard, { className: "space-y-4", children: [_jsx("h1", { className: "font-display text-3xl", children: "\u041E\u0444\u0444\u043B\u0430\u0439\u043D \u043C\u0430\u0442\u0447" }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-sm", children: "\u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C" }), _jsxs("select", { value: difficulty, onChange: (e) => setDifficulty(e.target.value), className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2", children: [_jsx("option", { value: "easy", children: "Easy" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "hard", children: "Hard" })] })] }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-sm", children: "\u0412\u0430\u0448 \u0446\u0432\u0435\u0442" }), _jsxs("select", { value: preferredColor, onChange: (e) => setPreferredColor(e.target.value), className: "w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2", children: [_jsx("option", { value: "random", children: "Random" }), _jsx("option", { value: "red", children: "Red" }), _jsx("option", { value: "yellow", children: "Yellow" })] })] }), _jsxs("div", { className: "rounded-2xl bg-black/25 p-3 text-sm", children: [_jsxs("p", { children: ["\u0412\u0430\u0448 \u0446\u0432\u0435\u0442: ", game.playerColor.toUpperCase()] }), _jsxs("p", { children: ["\u0425\u043E\u0434: ", game.currentTurnColor.toUpperCase()] }), _jsx("p", { className: "mt-2 font-semibold", children: summaryText }), botThinking ? _jsx("p", { className: "text-slate-200/90", children: "\u041A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440 \u0434\u0443\u043C\u0430\u0435\u0442..." }) : null, savedGameId ? _jsxs("p", { className: "mt-2 text-emerald-200", children: ["\u041C\u0430\u0442\u0447 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D: ", savedGameId] }) : null, saveError ? _jsx("p", { className: "mt-2 text-red-200", children: saveError }) : null] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { className: "rounded-xl bg-p2 px-3 py-2 font-semibold text-slate-900", onClick: () => startGame(), children: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430" }), _jsx("button", { className: "rounded-xl border border-white/35 px-3 py-2", onClick: () => startGame(oppositeColor(game.playerColor)), children: "\u0420\u0435\u0432\u0430\u043D\u0448 (\u0441\u043C\u0435\u043D\u0430 \u0446\u0432\u0435\u0442\u0430)" })] })] }), _jsx(GlassCard, { children: _jsx(GameBoard, { board: game.board, disabled: game.status !== 'active' || game.currentTurnColor !== game.playerColor, onDrop: handleDrop, hoveredColumn: hoveredColumn, onHoverColumn: setHoveredColumn, winLine: game.winLine }) })] }) }));
}
