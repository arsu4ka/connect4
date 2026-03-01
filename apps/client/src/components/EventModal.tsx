import { AnimatePresence, motion } from 'framer-motion';

export function EventModal({
  open,
  title,
  description,
  actionLabel,
  onClose
}: {
  open: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
  onClose: () => void;
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
            <p className="font-display text-2xl text-white sm:text-3xl">{title}</p>
            {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {actionLabel ?? 'Continue'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
