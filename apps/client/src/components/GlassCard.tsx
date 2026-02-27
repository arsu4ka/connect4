import type { PropsWithChildren } from 'react';

export function GlassCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-3xl border border-white/30 bg-white/15 p-5 shadow-soft backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}
