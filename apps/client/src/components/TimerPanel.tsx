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
    return <p className="text-sm text-slate-100/80">Без контроля времени</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-white">
      <div className={`rounded-2xl p-3 ${activeColor === 'red' ? 'bg-p1/90' : 'bg-white/20'}`}>
        <p className="text-xs uppercase tracking-wide">Red</p>
        <p className="font-display text-2xl leading-none">{msToClock(timeLeftMs.red)}</p>
      </div>
      <div
        className={`rounded-2xl p-3 ${activeColor === 'yellow' ? 'bg-p2/90 text-slate-900' : 'bg-white/20'}`}
      >
        <p className="text-xs uppercase tracking-wide">Yellow</p>
        <p className="font-display text-2xl leading-none">{msToClock(timeLeftMs.yellow)}</p>
      </div>
    </div>
  );
}
