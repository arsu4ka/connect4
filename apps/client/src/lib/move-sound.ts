export type MoveSoundTone = 'self' | 'opponent' | 'start';

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

    const playBeep = (frequency: number, startAt: number, duration: number, gainPeak: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.01);
    };

    const now = ctx.currentTime;
    if (tone === 'start') {
      playBeep(700, now, 0.16, 0.18);
      playBeep(940, now + 0.2, 0.2, 0.2);
      return;
    }

    playBeep(tone === 'self' ? 820 : 620, now, 0.22, 0.2);
  }

  function dispose() {
    if (context) {
      void context.close().catch(() => undefined);
      context = null;
    }
  }

  return { prime, play, dispose };
}
