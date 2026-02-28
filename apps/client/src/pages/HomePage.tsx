import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/GlassCard';
import { PageShell } from '../components/PageShell';

export function HomePage() {
  return (
    <PageShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="font-display text-5xl font-semibold">Connect Four</h1>
          <p className="mt-2 max-w-2xl text-slate-100/90">
            Современная браузерная версия с оффлайн AI и realtime матчами по ссылке.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <GlassCard className="space-y-4">
            <h2 className="font-display text-3xl">Оффлайн</h2>
            <p className="text-slate-100/85">
              Игра против AI, 3 уровня сложности, мгновенный реванш.
            </p>
            <Link
              to="/offline"
              className="inline-flex rounded-xl bg-p1 px-5 py-2 font-semibold text-white transition hover:translate-y-[-1px]"
            >
              Играть с компьютером
            </Link>
          </GlassCard>

          <GlassCard className="space-y-4">
            <h2 className="font-display text-3xl">Онлайн</h2>
            <p className="text-slate-100/85">
              Создайте приватный матч, отправьте ссылку другу и играйте в real-time.
            </p>
            <Link
              to="/online/create"
              className="inline-flex rounded-xl bg-p2 px-5 py-2 font-semibold text-slate-900 transition hover:translate-y-[-1px]"
            >
              Создать онлайн-игру
            </Link>
          </GlassCard>
        </div>
      </motion.div>
    </PageShell>
  );
}
