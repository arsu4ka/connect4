import type { DiscColor } from '@connect4/shared';

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
  timeLeftMs
}: {
  activeColor: DiscColor;
  timeLeftMs?: Record<DiscColor, number>;
}) {
  if (!timeLeftMs) {
    return <p className="text-sm text-slate-200/80">No time control</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-white">
      <div className={`timer-pill ${activeColor === 'red' ? 'is-active-red' : ''}`}>
        <p className="text-xs uppercase tracking-widest text-white/75">Red</p>
        <p className="font-display text-3xl leading-none">{msToClock(timeLeftMs.red)}</p>
      </div>
      <div className={`timer-pill ${activeColor === 'yellow' ? 'is-active-yellow' : ''}`}>
        <p className="text-xs uppercase tracking-widest text-white/75">Yellow</p>
        <p className="font-display text-3xl leading-none">{msToClock(timeLeftMs.yellow)}</p>
      </div>
    </div>
  );
}
