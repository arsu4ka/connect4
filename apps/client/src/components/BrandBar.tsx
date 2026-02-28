export function BrandBar() {
  return (
    <header className="mb-3 flex flex-wrap items-center gap-4">
      <a href="/" className="group inline-flex items-center gap-3">
        <img src="/logo.svg" alt="Connect4 logo" className="h-10 w-10 rounded-xl shadow-lg" />
        <div>
          <p className="font-display text-2xl leading-none text-white">Connect4</p>
          <p className="text-xs uppercase tracking-[0.28em] text-white/65">Color drop fun</p>
        </div>
      </a>
    </header>
  );
}
