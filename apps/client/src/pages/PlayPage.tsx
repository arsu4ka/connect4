import { motion } from 'framer-motion';
import type {
  DiscColor,
  FinishReason,
  GameState,
  PreferredColor,
  ServerEvent
} from '@connect4/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BrandBar } from '../components/BrandBar';
import { EventModal } from '../components/EventModal';
import { GameBoard } from '../components/GameBoard';
import { TimerPanel } from '../components/TimerPanel';
import { ToastStack, type ToastItem } from '../components/ToastStack';
import { type Difficulty, pickAIMove } from '../game/ai';
import { applyMove, emptyBoard, findWinLine, isDraw, oppositeColor } from '../game/logic';
import { createRoom, joinInvite, previewInvite, saveOfflineGame } from '../lib/api';
import { createMoveSoundPlayer } from '../lib/move-sound';
import {
  getInviteUrl,
  getPlayerColor,
  getPlayerToken,
  saveInviteUrl,
  savePlayerColor,
  savePlayerToken
} from '../lib/storage';
import { RoomSocket } from '../lib/ws-client';

type MatchMode = 'offline' | 'online';
type OnlineSetupTab = 'create' | 'join';
type OfflineStatus = 'idle' | 'active' | 'finished';

interface OfflineGame {
  board: Array<Array<DiscColor | null>>;
  status: OfflineStatus;
  currentTurnColor: DiscColor;
  playerColor: DiscColor;
  botColor: DiscColor;
  winnerColor: DiscColor | null;
  winLine: { from: [number, number]; to: [number, number] } | null;
  moveCount: number;
  finishedAt: string | null;
  moves: Array<{
    moveNumber: number;
    color: DiscColor;
    column: number;
    row: number;
    playedAt: string;
  }>;
}

interface OnlineSession {
  roomId: string;
  playerToken: string;
  myColor: DiscColor;
  inviteUrl?: string;
  isHost: boolean;
}

interface ModalState {
  title: string;
  description?: string;
  actionLabel?: string;
  emoji?: string;
}

function choosePlayerColor(preferred: PreferredColor): DiscColor {
  if (preferred === 'random') return Math.random() < 0.5 ? 'red' : 'yellow';
  return preferred;
}

function createOfflineIdleState(): OfflineGame {
  return {
    board: emptyBoard(),
    status: 'idle',
    currentTurnColor: 'red',
    playerColor: 'red',
    botColor: 'yellow',
    winnerColor: null,
    winLine: null,
    moveCount: 0,
    finishedAt: null,
    moves: []
  };
}

function createOfflineActiveState(
  preferredColor: PreferredColor,
  forcedColor?: DiscColor
): OfflineGame {
  const playerColor = forcedColor ?? choosePlayerColor(preferredColor);
  const botColor = oppositeColor(playerColor);

  return {
    board: emptyBoard(),
    status: 'active',
    currentTurnColor: 'red',
    playerColor,
    botColor,
    winnerColor: null,
    winLine: null,
    moveCount: 0,
    finishedAt: null,
    moves: []
  };
}

function applyOfflineTurn(state: OfflineGame, col: number, color: DiscColor): OfflineGame {
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

  const winLine = findWinLine(moved.board, moved.row, moved.col, color);
  if (winLine) {
    return {
      ...state,
      board: moved.board,
      moveCount,
      moves,
      status: 'finished',
      winnerColor: color,
      winLine,
      finishedAt: new Date().toISOString()
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
      winLine: null,
      finishedAt: new Date().toISOString()
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

function formatFinishReason(reason: FinishReason): string {
  if (reason === 'timeout') return 'Time out';
  if (reason === 'disconnect') return 'Disconnect';
  if (reason === 'draw') return 'Draw';
  return 'Victory';
}

function compactInviteUrl(url: string, maxLength = 38): string {
  if (url.length <= maxLength) return url;
  return `${url.slice(0, maxLength - 9)}...${url.slice(-6)}`;
}

export function PlayPage() {
  const navigate = useNavigate();
  const { inviteToken: routeInviteToken = '', roomId: routeRoomId = '' } = useParams();

  const [mode, setMode] = useState<MatchMode>('offline');
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toastTimersRef = useRef<number[]>([]);

  const [offlineDifficulty, setOfflineDifficulty] = useState<Difficulty>('medium');
  const [offlinePreferredColor, setOfflinePreferredColor] = useState<PreferredColor>('random');
  const [offlineGame, setOfflineGame] = useState<OfflineGame>(() => createOfflineIdleState());
  const [offlineBotThinking, setOfflineBotThinking] = useState(false);
  const [offlineSaveError, setOfflineSaveError] = useState<string | null>(null);
  const [offlineSavedForFinish, setOfflineSavedForFinish] = useState<string | null>(null);

  const [onlineTab, setOnlineTab] = useState<OnlineSetupTab>('create');
  const [onlineDisplayName, setOnlineDisplayName] = useState('');
  const [onlinePreferredColor, setOnlinePreferredColor] = useState<PreferredColor>('random');
  const [onlineTimerEnabled, setOnlineTimerEnabled] = useState(false);
  const [onlineTimerSeconds, setOnlineTimerSeconds] = useState(300);
  const [onlineCreating, setOnlineCreating] = useState(false);

  const [joinToken, setJoinToken] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [invitePreviewState, setInvitePreviewState] = useState<{
    loading: boolean;
    valid: boolean;
    hostName?: string;
    message?: string;
  } | null>(null);

  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(null);
  const [onlineState, setOnlineState] = useState<GameState | null>(null);
  const [onlineConnected, setOnlineConnected] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [rematchOffer, setRematchOffer] = useState<{ byDisplayName: string } | null>(null);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);

  const socketRef = useRef<RoomSocket | null>(null);
  const moveSoundRef = useRef(createMoveSoundPlayer());
  const lastOfflineMoveCountRef = useRef(0);

  const timePresets = [60, 180, 300, 600] as const;

  const pushToast = (message: string, tone: ToastItem['tone'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, tone, message }]);

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimersRef.current = toastTimersRef.current.filter((item) => item !== timer);
    }, 3200);

    toastTimersRef.current.push(timer);
  };

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const soundPlayer = moveSoundRef.current;
    const unlockAudio = () => soundPlayer.prime();
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      soundPlayer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!routeInviteToken) return;
    setMode('online');
    setOnlineTab('join');
    setJoinToken(routeInviteToken);
  }, [routeInviteToken]);

  useEffect(() => {
    if (!routeRoomId || onlineSession) return;
    const token = getPlayerToken(routeRoomId);
    const color = getPlayerColor(routeRoomId);
    if (!token || !color) return;

    setMode('online');
    setOnlineSession({
      roomId: routeRoomId,
      playerToken: token,
      myColor: color,
      inviteUrl: getInviteUrl(routeRoomId) ?? undefined,
      isHost: Boolean(getInviteUrl(routeRoomId))
    });
  }, [onlineSession, routeRoomId]);

  useEffect(() => {
    if (mode !== 'online' || onlineTab !== 'join' || onlineSession) return;

    const token = joinToken.trim();
    if (!token) {
      setInvitePreviewState(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setInvitePreviewState({ loading: true, valid: false });
      previewInvite(token)
        .then((preview) => {
          setInvitePreviewState({
            loading: false,
            valid: Boolean(preview.valid),
            hostName: preview.hostName,
            message: preview.valid ? 'Invite is valid.' : 'Invite is invalid or already used.'
          });
        })
        .catch(() => {
          setInvitePreviewState({
            loading: false,
            valid: false,
            message: 'Failed to check invite. Please try again.'
          });
        });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [joinToken, mode, onlineSession, onlineTab]);

  useEffect(() => {
    if (!onlineSession) return;

    const socket = new RoomSocket(
      onlineSession.roomId,
      {
        onOpen: () => {
          setOnlineConnected(true);
          socket.send({ type: 'join_room', playerToken: onlineSession.playerToken });
        },
        onClose: () => setOnlineConnected(false),
        onError: () => setOnlineConnected(false),
        onEvent: (event: ServerEvent) => {
          if (event.type === 'error_event') {
            setOnlineError(event.message);
            pushToast(`Online error: ${event.message}`, 'error');
            return;
          }

          if (event.type === 'player_disconnected') {
            pushToast('Opponent disconnected. Waiting for reconnection...', 'info');
          }

          if (event.type === 'player_reconnected') {
            pushToast('Opponent reconnected.', 'success');
          }

          if (event.type === 'game_started') {
            moveSoundRef.current.play('start');
            setModal({
              title: 'Match started',
              description: 'Both players are ready. Good luck!',
              emoji: '🚀'
            });
          }

          if (event.type === 'game_finished') {
            const yourWin =
              event.state.winnerColor && event.state.winnerColor === onlineSession.myColor;
            setRematchOffer(null);
            setRematchRequestedByMe(false);
            setModal({
              title: event.state.winnerColor ? (yourWin ? 'You won!' : 'You lost') : 'Draw',
              description: `Result reason: ${formatFinishReason(event.reason)}`,
              emoji: !event.state.winnerColor ? '🤝' : yourWin ? '🏆' : '😔'
            });
          }

          if (event.type === 'move_applied') {
            const moveColor = event.state.lastMove?.color;
            if (moveColor) {
              moveSoundRef.current.play(moveColor === onlineSession.myColor ? 'self' : 'opponent');
            }
          }

          if (event.type === 'rematch_started') {
            setRematchOffer(null);
            setRematchRequestedByMe(false);
            moveSoundRef.current.play('start');
            setModal({
              title: 'Rematch started',
              description: 'Colors swapped. New round is live.',
              emoji: '🔁'
            });
          }

          if (event.type === 'rematch_requested') {
            const isMine = event.byColor === onlineSession.myColor;
            if (isMine) {
              setRematchRequestedByMe(true);
            } else {
              setModal(null);
              setRematchOffer({ byDisplayName: event.byDisplayName });
            }
          }

          if (event.type === 'rematch_declined') {
            setRematchOffer(null);
            setRematchRequestedByMe(false);
            if (event.byColor !== onlineSession.myColor) {
              pushToast(`${event.byDisplayName} declined the rematch.`, 'error');
            }
          }

          if ('state' in event) {
            setOnlineState(event.state);
            setOnlineError(null);
            if (event.state.status !== 'finished') {
              setRematchOffer(null);
              setRematchRequestedByMe(false);
            }
          }
        }
      },
      { playerToken: onlineSession.playerToken }
    );

    socketRef.current = socket;

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [onlineSession]);

  useEffect(() => {
    if (mode !== 'offline') return;
    if (offlineGame.status !== 'active') return;
    if (offlineGame.currentTurnColor !== offlineGame.botColor) return;

    setOfflineBotThinking(true);
    const timer = window.setTimeout(() => {
      setOfflineGame((prev) => {
        if (prev.status !== 'active' || prev.currentTurnColor !== prev.botColor) return prev;
        const column = pickAIMove(prev.board, prev.botColor, offlineDifficulty);
        if (column < 0) return prev;
        return applyOfflineTurn(prev, column, prev.botColor);
      });
      setOfflineBotThinking(false);
    }, 360);

    return () => window.clearTimeout(timer);
  }, [
    mode,
    offlineDifficulty,
    offlineGame.botColor,
    offlineGame.currentTurnColor,
    offlineGame.status
  ]);

  useEffect(() => {
    if (mode !== 'offline') return;

    const moveCount = offlineGame.moveCount;
    if (moveCount <= lastOfflineMoveCountRef.current) {
      lastOfflineMoveCountRef.current = moveCount;
      return;
    }

    const lastMove = offlineGame.moves[offlineGame.moves.length - 1];
    if (lastMove) {
      const tone = lastMove.color === offlineGame.playerColor ? 'self' : 'opponent';
      moveSoundRef.current.play(tone);
    }

    lastOfflineMoveCountRef.current = moveCount;
  }, [mode, offlineGame.moveCount, offlineGame.moves, offlineGame.playerColor]);

  useEffect(() => {
    if (offlineGame.status !== 'finished' || !offlineGame.finishedAt) return;
    if (offlineSavedForFinish === offlineGame.finishedAt) return;

    setOfflineSavedForFinish(offlineGame.finishedAt);
    setOfflineSaveError(null);

    saveOfflineGame({
      displayName: 'Player',
      difficulty: offlineDifficulty,
      preferredColor: offlinePreferredColor,
      playerColor: offlineGame.playerColor,
      timeControl: { type: 'none' },
      finishedReason: offlineGame.winnerColor ? 'win' : 'draw',
      winnerColor: offlineGame.winnerColor,
      moves: offlineGame.moves
    }).catch((error: unknown) => {
      setOfflineSaveError(error instanceof Error ? error.message : 'Failed to save offline game.');
    });

    const resultTitle = !offlineGame.winnerColor
      ? 'Draw'
      : offlineGame.winnerColor === offlineGame.playerColor
        ? 'You won!'
        : 'Computer won';

    setModal({
      title: resultTitle,
      description: 'You can start a new game or play a rematch with swapped colors.',
      emoji: !offlineGame.winnerColor ? '🤝' : offlineGame.winnerColor === offlineGame.playerColor ? '🏆' : '🤖'
    });
  }, [offlineDifficulty, offlineGame, offlinePreferredColor, offlineSavedForFinish]);

  const boardState = useMemo(() => {
    if (mode === 'online') {
      const onlineDisabled =
        !onlineState ||
        onlineState.status !== 'active' ||
        Boolean(onlineState.paused) ||
        !onlineSession ||
        onlineState.currentTurnColor !== onlineSession.myColor;

      return {
        board: onlineState?.board ?? emptyBoard(),
        winLine: onlineState?.winLine ?? null,
        disabled: onlineDisabled,
        previewColor: !onlineDisabled && onlineSession ? onlineSession.myColor : null,
        subtitle: !onlineState
          ? 'Connecting to room...'
          : onlineState.status === 'waiting'
            ? 'Waiting for the second player'
            : onlineState.status === 'active'
              ? onlineState.currentTurnColor === onlineSession?.myColor
                ? 'Your turn'
                : 'Opponent turn'
              : 'Match finished'
      };
    }

    return {
      board: offlineGame.board,
      winLine: offlineGame.winLine,
      disabled:
        offlineGame.status !== 'active' || offlineGame.currentTurnColor !== offlineGame.playerColor,
      previewColor:
        offlineGame.status === 'active' && offlineGame.currentTurnColor === offlineGame.playerColor
          ? offlineGame.playerColor
          : null,
      subtitle:
        offlineGame.status === 'idle'
          ? 'Set up your match on the right panel'
          : offlineGame.status === 'active'
            ? offlineGame.currentTurnColor === offlineGame.playerColor
              ? 'Your turn'
              : 'Computer turn'
            : 'Match finished'
    };
  }, [mode, offlineGame, onlineSession, onlineState]);

  const onlineStatusText = useMemo(() => {
    if (!onlineSession) return 'Not connected';
    if (!onlineState) return 'Connecting...';
    if (onlineState.status === 'waiting') return 'Waiting for your friend';
    if (onlineState.status === 'active')
      return onlineState.paused ? 'Paused (reconnection)' : 'Live';
    return 'Finished';
  }, [onlineSession, onlineState]);

  const isModeLocked =
    (mode === 'offline' && offlineGame.status === 'active') ||
    (mode === 'online' && onlineState?.status === 'active');

  async function handleCreateOnline(e: React.FormEvent) {
    e.preventDefault();
    setOnlineCreating(true);
    setOnlineError(null);

    try {
      const room = await createRoom({
        preferredColor: onlinePreferredColor,
        displayName: onlineDisplayName.trim() || undefined,
        timeControl: onlineTimerEnabled
          ? { type: 'clock', secondsPerPlayer: onlineTimerSeconds }
          : { type: 'none' }
      });

      savePlayerToken(room.roomId, room.playerToken);
      savePlayerColor(room.roomId, room.yourColor);
      saveInviteUrl(room.roomId, room.inviteUrl);

      setOnlineSession({
        roomId: room.roomId,
        playerToken: room.playerToken,
        myColor: room.yourColor,
        inviteUrl: room.inviteUrl,
        isHost: true
      });
      setOnlineState(null);
      setRematchOffer(null);
      setRematchRequestedByMe(false);
      setOnlineTab('create');
      pushToast('Room created. Share your invite link.', 'success');
      navigate(`/online/game/${room.roomId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room.';
      setOnlineError(message);
      pushToast(message, 'error');
    } finally {
      setOnlineCreating(false);
    }
  }

  async function handleJoinOnline(e: React.FormEvent) {
    e.preventDefault();
    const token = joinToken.trim();
    if (!token) {
      setOnlineError('Invite token is required.');
      return;
    }

    setJoining(true);
    setOnlineError(null);

    try {
      const joined = await joinInvite(token, joinDisplayName.trim() || undefined);
      savePlayerToken(joined.roomId, joined.playerToken);
      savePlayerColor(joined.roomId, joined.yourColor);

      setOnlineSession({
        roomId: joined.roomId,
        playerToken: joined.playerToken,
        myColor: joined.yourColor,
        isHost: false
      });
      setOnlineState(null);
      setRematchOffer(null);
      setRematchRequestedByMe(false);
      pushToast('Joined room successfully.', 'success');
      navigate(`/online/game/${joined.roomId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room.';
      setOnlineError(message);
      pushToast(message, 'error');
    } finally {
      setJoining(false);
    }
  }

  function handleOfflineDrop(column: number) {
    setOfflineGame((prev) => {
      if (prev.status !== 'active') return prev;
      if (prev.currentTurnColor !== prev.playerColor) return prev;
      return applyOfflineTurn(prev, column, prev.playerColor);
    });
  }

  function handleBoardDrop(column: number) {
    if (mode === 'online') {
      socketRef.current?.send({ type: 'make_move', column });
      return;
    }

    handleOfflineDrop(column);
  }

  function startOfflineGame(forceColor?: DiscColor) {
    setMode('offline');
    setOfflineSavedForFinish(null);
    setOfflineSaveError(null);
    setOfflineGame(createOfflineActiveState(offlinePreferredColor, forceColor));
  }

  function leaveOnlineMatch() {
    socketRef.current?.close();
    socketRef.current = null;
    setOnlineSession(null);
    setOnlineState(null);
    setOnlineConnected(false);
    setOnlineError(null);
    setRematchOffer(null);
    setRematchRequestedByMe(false);
    setMode('online');
    navigate('/');
  }

  function handleRequestRematch() {
    if (rematchRequestedByMe) return;
    socketRef.current?.send({ type: 'request_rematch' });
    setRematchRequestedByMe(true);
    pushToast('Rematch request sent.', 'info');
  }

  function handleAcceptRematch() {
    socketRef.current?.send({ type: 'request_rematch' });
    setRematchRequestedByMe(true);
    setRematchOffer(null);
  }

  function handleDeclineRematch() {
    socketRef.current?.send({ type: 'decline_rematch' });
    setRematchOffer(null);
  }

  async function copyInviteLink() {
    if (!onlineSession?.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(onlineSession.inviteUrl);
      pushToast('Invite link copied.', 'success');
    } catch {
      pushToast('Failed to copy invite link.', 'error');
    }
  }

  function openHowToPlay() {
    setModal({
      title: 'How to play?',
      description:
        'Players drop discs into columns. The disc falls to the lowest empty slot. First player to connect four discs in a row (horizontal, vertical, or diagonal) wins. If the board fills with no four-in-a-row, the game is a draw.',
      actionLabel: "Let's play",
      emoji: '📘'
    });
  }

  const offlineResultText =
    offlineGame.status !== 'finished'
      ? 'No result yet.'
      : !offlineGame.winnerColor
        ? 'Draw'
        : offlineGame.winnerColor === offlineGame.playerColor
          ? 'You won'
          : 'Computer won';

  function renderOfflineInfoPanel(showIdleHint = false) {
    if (offlineGame.status === 'idle') {
      return showIdleHint ? (
        <div className="panel-block text-sm text-slate-200">
          <p>Choose settings in Controls and start a match.</p>
        </div>
      ) : null;
    }

    return (
      <div className="panel-block text-sm text-slate-200">
        <p>Current turn: {offlineGame.currentTurnColor.toUpperCase()}</p>
        <p>Your color: {offlineGame.playerColor.toUpperCase()}</p>
        <p>Result: {offlineResultText}</p>
        {offlineBotThinking ? <p>Computer is thinking...</p> : null}
        {offlineSaveError ? <p className="text-rose-300">{offlineSaveError}</p> : null}
      </div>
    );
  }

  function renderOfflineControlsPanel() {
    return (
      <div className="space-y-3">
        {offlineGame.status === 'idle' ? (
          <>
            <label className="field-group">
              <span>Difficulty</span>
              <select
                value={offlineDifficulty}
                onChange={(event) => setOfflineDifficulty(event.target.value as Difficulty)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label className="field-group">
              <span>Your color</span>
              <select
                value={offlinePreferredColor}
                onChange={(event) => setOfflinePreferredColor(event.target.value as PreferredColor)}
              >
                <option value="random">Random</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
              </select>
            </label>

            <button
              type="button"
              className="primary-button w-full sm:w-auto"
              onClick={() => startOfflineGame()}
            >
              Start Offline Game
            </button>
          </>
        ) : null}

        {offlineGame.status === 'active' ? (
          <button
            type="button"
            className="ghost-button w-full sm:w-auto"
            onClick={() => setOfflineGame(createOfflineIdleState())}
          >
            Back to setup
          </button>
        ) : null}

        {offlineGame.status === 'finished' ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="primary-button" onClick={() => startOfflineGame()}>
              Play again
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => startOfflineGame(oppositeColor(offlineGame.playerColor))}
            >
              Rematch (swap colors)
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderOfflinePanel() {
    return (
      <div className="space-y-5">
        <div>
          <p className="panel-eyebrow">Offline mode</p>
          <h2 className="font-display text-3xl text-white">Play vs Computer</h2>
        </div>

        {renderOfflineInfoPanel(false)}
        {renderOfflineControlsPanel()}
      </div>
    );
  }

  function renderOnlineSetup({ showHeading = true }: { showHeading?: boolean } = {}) {
    return (
      <div className="space-y-5">
        {showHeading ? (
          <div>
            <p className="panel-eyebrow">Online mode</p>
            <h2 className="font-display text-3xl text-white">Create or Join Match</h2>
          </div>
        ) : null}

        <div className="mode-switch">
          <button
            type="button"
            className={onlineTab === 'create' ? 'is-active' : ''}
            onClick={() => setOnlineTab('create')}
          >
            Create
          </button>
          <button
            type="button"
            className={onlineTab === 'join' ? 'is-active' : ''}
            onClick={() => setOnlineTab('join')}
          >
            Join
          </button>
        </div>

        {onlineTab === 'create' ? (
          <form className="space-y-3" onSubmit={handleCreateOnline}>
            <label className="field-group">
              <span>Display name</span>
              <input
                value={onlineDisplayName}
                onChange={(event) => setOnlineDisplayName(event.target.value)}
                placeholder="Host"
              />
            </label>

            <label className="field-group">
              <span>Preferred color</span>
              <select
                value={onlinePreferredColor}
                onChange={(event) => setOnlinePreferredColor(event.target.value as PreferredColor)}
              >
                <option value="random">Random</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
              </select>
            </label>

            <div className="panel-block space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="ui-checkbox"
                  checked={onlineTimerEnabled}
                  onChange={(event) => setOnlineTimerEnabled(event.target.checked)}
                />
                Enable chess clock
              </label>
              {onlineTimerEnabled ? (
                <select
                  value={onlineTimerSeconds}
                  onChange={(event) => setOnlineTimerSeconds(Number(event.target.value))}
                >
                  {timePresets.map((seconds) => (
                    <option value={seconds} key={seconds}>
                      {Math.floor(seconds / 60)} min per player
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <button
              type="submit"
              className="primary-button w-full sm:w-auto"
              disabled={onlineCreating}
            >
              {onlineCreating ? 'Creating room...' : 'Create online room'}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleJoinOnline}>
            <label className="field-group">
              <span>Invite token</span>
              <input
                value={joinToken}
                onChange={(event) => setJoinToken(event.target.value)}
                placeholder="Paste invite token"
              />
            </label>

            <label className="field-group">
              <span>Display name</span>
              <input
                value={joinDisplayName}
                onChange={(event) => setJoinDisplayName(event.target.value)}
                placeholder="Guest"
              />
            </label>

            {invitePreviewState ? (
              <div className="panel-block text-sm text-slate-200">
                <p>
                  {invitePreviewState.loading
                    ? 'Checking invite...'
                    : invitePreviewState.valid
                      ? `Invite is valid. Host: ${invitePreviewState.hostName ?? 'Host'}`
                      : invitePreviewState.message}
                </p>
              </div>
            ) : null}

            <button type="submit" className="primary-button w-full sm:w-auto" disabled={joining}>
              {joining ? 'Joining...' : 'Join online room'}
            </button>
          </form>
        )}

        {onlineError ? <p className="text-sm text-rose-300">{onlineError}</p> : null}
      </div>
    );
  }

  function renderOnlineLiveInfoPanel() {
    const currentTurn = onlineState?.currentTurnColor ?? onlineSession?.myColor ?? 'red';

    return (
      <div className="space-y-4">
        <div className="panel-block text-sm text-slate-200">
          <p>Connection: {onlineConnected ? 'Online' : 'Offline'}</p>
          <p>Status: {onlineStatusText}</p>
          <p>Your color: {onlineSession?.myColor.toUpperCase()}</p>
          {onlineState?.paused ? <p>Game paused: waiting for reconnection.</p> : null}
        </div>

        <TimerPanel activeColor={currentTurn} timeLeftMs={onlineState?.timeLeftMs} />

        {onlineError ? <p className="text-sm text-rose-300">{onlineError}</p> : null}
      </div>
    );
  }

  function renderOnlineLiveControlsPanel() {
    const inviteLinkPreview = onlineSession?.inviteUrl
      ? compactInviteUrl(onlineSession.inviteUrl)
      : null;

    return (
      <div className="space-y-3">
        {onlineSession?.inviteUrl ? (
          <button type="button" className="invite-button" onClick={copyInviteLink}>
            <span className="invite-main">
              <span className="invite-label">Invite link</span>
              <span className="invite-value">{inviteLinkPreview}</span>
            </span>
            <span className="invite-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 9a2 2 0 0 1 2-2h8v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V9Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M15 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </button>
        ) : null}

        {onlineState?.status === 'finished' ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="primary-button"
              onClick={handleRequestRematch}
              disabled={rematchRequestedByMe}
            >
              {rematchRequestedByMe ? 'Rematch requested...' : 'Request rematch'}
            </button>
            <button type="button" className="ghost-button" onClick={leaveOnlineMatch}>
              Leave room
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ghost-button w-full sm:w-auto"
            onClick={leaveOnlineMatch}
          >
            Leave room
          </button>
        )}
      </div>
    );
  }

  function renderOnlineLivePanel() {
    return (
      <div className="space-y-5">
        <div>
          <p className="panel-eyebrow">Online mode</p>
          <h2 className="font-display text-3xl text-white">Live Match</h2>
        </div>

        {renderOnlineLiveInfoPanel()}
        {renderOnlineLiveControlsPanel()}
      </div>
    );
  }

  return (
    <div className="app-background app-shell px-3 py-3 text-white sm:px-5 lg:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col">
        <BrandBar />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] 2xl:grid-cols-[minmax(0,7fr)_minmax(330px,3fr)]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-board flex flex-col lg:min-h-0 lg:h-full"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="panel-eyebrow">Board</p>
                <p className="font-display text-3xl">
                  {mode === 'online' ? 'Online Arena' : 'Offline Arena'}
                </p>
              </div>
              <p className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200">
                {boardState.subtitle}
              </p>
            </div>

            <div className="board-stage">
              <GameBoard
                board={boardState.board}
                disabled={boardState.disabled}
                previewColor={boardState.previewColor}
                onDrop={handleBoardDrop}
                hoveredColumn={hoveredColumn}
                onHoverColumn={setHoveredColumn}
                winLine={boardState.winLine}
              />
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
            className="panel-side self-start"
          >
            <div className="mode-switch mb-4">
              <button
                type="button"
                disabled={isModeLocked}
                className={mode === 'offline' ? 'is-active' : ''}
                onClick={() => setMode('offline')}
              >
                Offline
              </button>
              <button
                type="button"
                disabled={isModeLocked}
                className={mode === 'online' ? 'is-active' : ''}
                onClick={() => setMode('online')}
              >
                Online
              </button>
            </div>

            {mode === 'offline'
              ? renderOfflinePanel()
              : onlineSession
                ? renderOnlineLivePanel()
                : renderOnlineSetup()}
          </motion.aside>
        </div>

        <footer className="site-footer mt-3">
          <div className="site-footer-left">
            <a href="/" className="site-footer-brand">
              <img src="/logo.svg" alt="Connect4 logo" className="h-7 w-7 rounded-lg" />
              <span>Connect4</span>
            </a>
            <p className="site-footer-copy">
              Made by{' '}
              <a
                className="site-footer-link"
                href="https://t.me/arsu4ka"
                target="_blank"
                rel="noreferrer"
              >
                @arsu4ka
              </a>
            </p>
          </div>
          <div className="site-footer-actions">
            <button type="button" className="howto-button" onClick={openHowToPlay}>
              How to play?
            </button>
          </div>
        </footer>
      </div>

      <EventModal
        open={Boolean(modal)}
        title={modal?.title ?? ''}
        description={modal?.description}
        actionLabel={modal?.actionLabel ?? 'Got it'}
        emoji={modal?.emoji}
        onClose={() => setModal(null)}
      />
      <EventModal
        open={Boolean(rematchOffer)}
        title="Rematch request"
        description={`${rematchOffer?.byDisplayName ?? 'Your opponent'} wants a rematch.`}
        actionLabel="Accept"
        secondaryActionLabel="Decline"
        emoji="🤝"
        onClose={handleAcceptRematch}
        onSecondaryAction={handleDeclineRematch}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}
