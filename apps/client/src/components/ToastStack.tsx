import { AnimatePresence, motion } from 'framer-motion';

export interface ToastItem {
  id: string;
  tone: 'success' | 'info' | 'error';
  message: string;
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-2 z-50 flex w-[min(360px,calc(100vw-1rem))] flex-col gap-2 sm:bottom-5 sm:right-5 sm:w-[min(360px,calc(100vw-2rem))]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className={`rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.tone === 'success'
                ? 'border-emerald-200/30 bg-emerald-500/20 text-emerald-100'
                : toast.tone === 'error'
                  ? 'border-rose-300/30 bg-rose-500/20 text-rose-100'
                  : 'border-cyan-200/30 bg-cyan-500/20 text-cyan-100'
            }`}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
