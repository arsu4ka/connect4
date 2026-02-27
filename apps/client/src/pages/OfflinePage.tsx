import { useEffect, useMemo, useState } from 'react';
import type { DiscColor, PreferredColor, WinLine } from '@connect4/shared';
import { pickAIMove, type Difficulty } from '../game/ai';
import { applyMove, emptyBoard, findWinLine, isDraw, oppositeColor } from '../game/logic';
import { saveOfflineGame } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import { GameBoard } from '../components/GameBoard';
import { PageShell } from '../components/PageShell';

interface OfflineState {
  board: Array<Array<DiscColor | null>>;
  currentTurnColor: DiscColor;
  status: 'active' | 'finished';
  winnerColor: DiscColor | null;
  winLine: WinLine | null;
  playerColor: DiscColor;
  botColor: DiscColor;
  moveCount: number;
  moves: Array<{ moveNumber: number; color: DiscColor; column: number; row: number; playedAt: string }>;
}

function pickPlayerColor(pref: PreferredColor): DiscColor {
  if (pref === 'random') return Math.random() < 0.5 ? 'red' : 'yellow';
  return pref;
}

function createGame(pref: PreferredColor, forcedPlayerColor?: DiscColor): OfflineState {
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

function applyTurn(state: OfflineState, col: number, color: DiscColor): OfflineState {
  const moved = applyMove(state.board, col, color);
  if (!moved) return state;

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
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [preferredColor, setPreferredColor] = useState<PreferredColor>('random');
  const [game, setGame] = useState<OfflineState>(() => createGame('random'));
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const summaryText = useMemo(() => {
    if (game.status === 'active') return 'Игра продолжается';
    if (!game.winnerColor) return 'Ничья';
    return game.winnerColor === game.playerColor ? 'Вы победили' : 'Компьютер победил';
  }, [game]);

  function startGame(forceColor?: DiscColor) {
    setSavedGameId(null);
    setSaveError(null);
    setGame(createGame(preferredColor, forceColor));
  }

  function handleDrop(column: number) {
    setGame((prev) => {
      if (prev.status !== 'active') return prev;
      if (prev.currentTurnColor !== prev.playerColor) return prev;
      return applyTurn(prev, column, prev.playerColor);
    });
  }

  useEffect(() => {
    if (game.status !== 'active') return;
    if (game.currentTurnColor !== game.botColor) return;

    setBotThinking(true);
    const timer = window.setTimeout(() => {
      setGame((prev) => {
        if (prev.status !== 'active' || prev.currentTurnColor !== prev.botColor) return prev;
        const col = pickAIMove(prev.board, prev.botColor, difficulty);
        if (col < 0) return prev;
        return applyTurn(prev, col, prev.botColor);
      });
      setBotThinking(false);
    }, 360);

    return () => window.clearTimeout(timer);
  }, [game.status, game.currentTurnColor, game.botColor, difficulty]);

  useEffect(() => {
    if (game.status !== 'finished' || savedGameId || saveError) return;

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
      .catch((error: unknown) => {
        setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить матч');
      });
  }, [difficulty, game, preferredColor, saveError, savedGameId]);

  return (
    <PageShell>
      <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
        <GlassCard className="space-y-4">
          <h1 className="font-display text-3xl">Оффлайн матч</h1>

          <label className="block space-y-1">
            <span className="text-sm">Сложность</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Ваш цвет</span>
            <select
              value={preferredColor}
              onChange={(e) => setPreferredColor(e.target.value as PreferredColor)}
              className="w-full rounded-xl border border-white/30 bg-black/20 px-3 py-2"
            >
              <option value="random">Random</option>
              <option value="red">Red</option>
              <option value="yellow">Yellow</option>
            </select>
          </label>

          <div className="rounded-2xl bg-black/25 p-3 text-sm">
            <p>Ваш цвет: {game.playerColor.toUpperCase()}</p>
            <p>Ход: {game.currentTurnColor.toUpperCase()}</p>
            <p className="mt-2 font-semibold">{summaryText}</p>
            {botThinking ? <p className="text-slate-200/90">Компьютер думает...</p> : null}
            {savedGameId ? <p className="mt-2 text-emerald-200">Матч сохранен: {savedGameId}</p> : null}
            {saveError ? <p className="mt-2 text-red-200">{saveError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl bg-p2 px-3 py-2 font-semibold text-slate-900" onClick={() => startGame()}>
              Новая игра
            </button>
            <button
              className="rounded-xl border border-white/35 px-3 py-2"
              onClick={() => startGame(oppositeColor(game.playerColor))}
            >
              Реванш (смена цвета)
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <GameBoard
            board={game.board}
            disabled={game.status !== 'active' || game.currentTurnColor !== game.playerColor}
            onDrop={handleDrop}
            hoveredColumn={hoveredColumn}
            onHoverColumn={setHoveredColumn}
            winLine={game.winLine}
          />
        </GlassCard>
      </div>
    </PageShell>
  );
}
