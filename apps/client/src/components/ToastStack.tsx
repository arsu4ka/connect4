import { AnimatePresence, motion } from 'framer-motion';

export interface ToastItem {
  id: string;
  tone: 'success' | 'info' | 'error';
  message: string;
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const toneMeta: Record<
    ToastItem['tone'],
    { emoji: string; className: string; iconClassName: string }
  > = {
    success: {
      emoji: '✅',
      className: 'border-emerald-300/60 bg-emerald-500/28 text-emerald-50',
      iconClassName: 'bg-emerald-200/30 text-emerald-50'
    },
    info: {
      emoji: 'ℹ️',
      className: 'border-sky-300/60 bg-sky-500/28 text-sky-50',
      iconClassName: 'bg-sky-200/30 text-sky-50'
    },
    error: {
      emoji: '❌',
      className: 'border-rose-300/60 bg-rose-500/32 text-rose-50',
      iconClassName: 'bg-rose-200/30 text-rose-50'
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-2 z-50 flex w-[min(360px,calc(100vw-1rem))] flex-col gap-2 sm:bottom-5 sm:right-5 sm:w-[min(360px,calc(100vw-2rem))]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const meta = toneMeta[toast.tone];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className={`rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${meta.className}`}
            >
              <p className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${meta.iconClassName}`}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
                <span>{toast.message}</span>
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
