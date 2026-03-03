import type { DiscColor, TimeControl } from '@connect4/shared';

function msToClock(ms?: number): string {
  if (ms === undefined) return '--:--';
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function TimerPanel({
  activeColor,
  status,
  timeControl,
  timeLeftMs
}: {
  activeColor: DiscColor;
  status: 'waiting' | 'active' | 'finished';
  timeControl?: TimeControl;
  timeLeftMs?: Record<DiscColor, number>;
}) {
  const showInfinity = timeControl?.type === 'none';
  const redValue = showInfinity ? '∞' : msToClock(timeLeftMs?.red);
  const yellowValue = showInfinity ? '∞' : msToClock(timeLeftMs?.yellow);
  const redIsActive = status === 'active' && activeColor === 'red';
  const yellowIsActive = status === 'active' && activeColor === 'yellow';
  const redClass = `timer-pill ${redIsActive ? 'is-active-red' : ''} ${!redIsActive ? 'is-dim' : ''}`;
  const yellowClass = `timer-pill ${yellowIsActive ? 'is-active-yellow' : ''} ${!yellowIsActive ? 'is-dim' : ''}`;

  return (
    <div className="timer-panel grid grid-cols-2 gap-3 text-white">
      <div className={redClass.trim()}>
        <p className="text-xs uppercase tracking-widest text-white/75">Red</p>
        <p className="font-display text-[1.65rem] leading-none sm:text-3xl">
          {redValue}
        </p>
      </div>
      <div className={yellowClass.trim()}>
        <p className="text-xs uppercase tracking-widest text-white/75">Yellow</p>
        <p className="font-display text-[1.65rem] leading-none sm:text-3xl">
          {yellowValue}
        </p>
      </div>
    </div>
  );
}
