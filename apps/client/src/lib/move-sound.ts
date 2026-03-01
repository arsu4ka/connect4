export type MoveSoundTone = 'self' | 'opponent';

export interface MoveSoundPlayer {
  prime(): void;
  play(tone: MoveSoundTone): void;
  dispose(): void;
}

type AudioContextCtor = typeof AudioContext;
type BrowserWindowWithWebkitAudio = Window & { webkitAudioContext?: AudioContextCtor };

export function createMoveSoundPlayer(): MoveSoundPlayer {
  let context: AudioContext | null = null;

  function getAudioContextCtor(): AudioContextCtor | null {
    const standardCtor = typeof AudioContext === 'undefined' ? null : AudioContext;
    if (standardCtor) return standardCtor;
    if (typeof window === 'undefined') return null;
    return (window as BrowserWindowWithWebkitAudio).webkitAudioContext ?? null;
  }

  function ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!context) {
      const Ctor = getAudioContextCtor();
      if (!Ctor) return null;
      try {
        context = new Ctor();
      } catch {
        return null;
      }
    }
    return context;
  }

  function prime() {
    const ctx = ensureContext();
    if (!ctx || ctx.state !== 'suspended') return;
    void ctx.resume().catch(() => undefined);
  }

  function play(tone: MoveSoundTone) {
    const ctx = ensureContext();
    if (!ctx) return;

    if (ctx.state !== 'running') {
      void ctx
        .resume()
        .then(() => {
          play(tone);
        })
        .catch(() => undefined);
      return;
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const frequency = tone === 'self' ? 820 : 620;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.23);
  }

  function dispose() {
    if (context) {
      void context.close().catch(() => undefined);
      context = null;
    }
  }

  return { prime, play, dispose };
}
