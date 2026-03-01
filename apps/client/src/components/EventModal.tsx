import { AnimatePresence, motion } from 'framer-motion';

export function EventModal({
  open,
  title,
  description,
  actionLabel,
  onClose,
  secondaryActionLabel,
  onSecondaryAction,
  emoji
}: {
  open: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
  onClose: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  emoji?: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 23 }}
            className="max-h-[min(86svh,640px)] w-full max-w-md overflow-auto rounded-3xl border border-white/15 bg-[#111827]/90 p-5 shadow-2xl sm:p-6"
          >
            <p className="flex items-center gap-2 font-display text-2xl text-white sm:text-3xl">
              {emoji ? (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xl"
                  aria-hidden
                >
                  {emoji}
                </span>
              ) : null}
              <span>{title}</span>
            </p>
            {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
            {secondaryActionLabel && onSecondaryAction ? (
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onSecondaryAction}
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  {secondaryActionLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  {actionLabel ?? 'Continue'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {actionLabel ?? 'Continue'}
              </button>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
