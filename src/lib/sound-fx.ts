/**
 * Procedural sound effects (Web Audio API). Zero audio files, SSR-safe, never throws.
 */

const STORAGE_KEY = "sb-sfx-muted";

type Listener = (muted: boolean) => void;

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted: boolean | null = null;
const listeners = new Set<Listener>();

function readMuted(): boolean {
  if (muted !== null) return muted;
  let v = false;
  try {
    if (typeof window !== "undefined") v = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    v = false;
  }
  muted = v;
  return v;
}

function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

/** Runs `fn` with a ready context + output node, only when audible. Swallows every error. */
function play(fn: (c: AudioContext, out: AudioNode, t: number) => void): void {
  try {
    if (readMuted()) return;
    const c = getCtx();
    if (!c || !master) return;
    fn(c, master, c.currentTime + 0.005);
  } catch {
    /* audio must never break the UI */
  }
}

function tone(
  c: AudioContext,
  out: AudioNode,
  t: number,
  opts: { type?: OscillatorType; f0: number; f1?: number; dur: number; peak: number; attack?: number }
): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(opts.f0, t);
  if (opts.f1) o.frequency.exponentialRampToValueAtTime(opts.f1, t + opts.dur);
  const a = opts.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(opts.peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + opts.dur + 0.05);
}

function noise(
  c: AudioContext,
  out: AudioNode,
  t: number,
  opts: { dur: number; peak: number; type: BiquadFilterType; freq: number; q?: number; freqEnd?: number }
): GainNode {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = opts.type;
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
  f.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(opts.peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random());
  src.stop(t + opts.dur + 0.05);
  return g;
}

function bell(c: AudioContext, out: AudioNode, t: number, freq: number, peak: number, dur: number): void {
  // Slightly inharmonic partials give a metallic bell timbre.
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.76, 0.45],
    [5.4, 0.2],
    [8.93, 0.1],
  ];
  for (const [ratio, amp] of partials) {
    tone(c, out, t, { f0: freq * ratio, dur: dur / (1 + ratio * 0.25), peak: peak * amp, attack: 0.003 });
  }
}

export const sfx = {
  unlock(): void {
    try {
      const c = getCtx();
      if (!c) return;
      // Playing a silent buffer unlocks audio on older iOS.
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
  },

  setMuted(next: boolean): void {
    muted = next;
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage may be blocked */
    }
    listeners.forEach((l) => {
      try {
        l(next);
      } catch {
        /* ignore listener errors */
      }
    });
  },

  isMuted(): boolean {
    return readMuted();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  thud(): void {
    play((c, out, t) => {
      tone(c, out, t, { type: "sine", f0: 120, f1: 40, dur: 0.38, peak: 0.95 });
      tone(c, out, t, { type: "triangle", f0: 180, f1: 55, dur: 0.22, peak: 0.45 });
      noise(c, out, t, { dur: 0.14, peak: 0.55, type: "lowpass", freq: 2400, freqEnd: 300, q: 0.7 });
      // short metallic ring
      for (const [fr, amp] of [[523, 0.1], [1396, 0.07], [2210, 0.05], [3340, 0.03]] as const) {
        tone(c, out, t + 0.01, { type: "sine", f0: fr, dur: 0.28, peak: amp });
      }
    });
  },

  /** Quiet ember tail. `level` scales loudness (1 = full sizzle). */
  sizzle(level = 1): void {
    play((c, out, t) => {
      const dur = 0.8;
      const g = noise(c, out, t + 0.03, { dur, peak: 0.22 * level, type: "bandpass", freq: 6200, q: 0.9 });
      // crackle: random amplitude pops layered on the envelope
      const lfo = c.createGain();
      lfo.gain.value = 1;
      g.disconnect();
      g.connect(lfo);
      lfo.connect(out);
      let x = t + 0.03;
      lfo.gain.setValueAtTime(1, x);
      while (x < t + dur) {
        x += 0.012 + Math.random() * 0.04;
        lfo.gain.setValueAtTime(Math.random() < 0.35 ? 0.1 : 0.5 + Math.random() * 0.9, x);
      }
      noise(c, out, t + 0.02, { dur: 0.5, peak: 0.08 * level, type: "highpass", freq: 9000, q: 0.5 });
    });
  },

  /**
   * Metallic stamp clack: bright noise transient + pitched metal ring + low body.
   * Pitch climbs a major-pentatonic ladder with the stamp index (0-9, wraps).
   */
  clack(index = 0): void {
    play((c, out, t) => {
      const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      const i = ((Math.floor(index) % 10) + 10) % 10;
      const f = 523.25 * Math.pow(2, steps[i] / 12);
      noise(c, out, t, { dur: 0.03, peak: 0.55, type: "highpass", freq: 4200, q: 0.7 });
      tone(c, out, t, { type: "triangle", f0: f * 2, f1: f * 1.96, dur: 0.1, peak: 0.2, attack: 0.001 });
      tone(c, out, t, { type: "sine", f0: f * 2.76, dur: 0.2, peak: 0.07, attack: 0.001 });
      tone(c, out, t, { type: "sine", f0: 150 + i * 5, f1: 62, dur: 0.16, peak: 0.55, attack: 0.002 });
    });
  },

  chime(): void {
    play((c, out, t) => {
      const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
      notes.forEach((f, i) => bell(c, out, t + i * 0.1, f, 0.22, 1.1));
      bell(c, out, t + notes.length * 0.1, 2093, 0.16, 1.6);
    });
  },

  error(): void {
    play((c, out, t) => {
      tone(c, out, t, { type: "sawtooth", f0: 120, f1: 90, dur: 0.22, peak: 0.28 });
      tone(c, out, t + 0.14, { type: "square", f0: 95, f1: 70, dur: 0.24, peak: 0.2 });
    });
  },

  click(): void {
    play((c, out, t) => {
      tone(c, out, t, { type: "triangle", f0: 1800, f1: 900, dur: 0.035, peak: 0.12, attack: 0.001 });
    });
  },

  success(): void {
    play((c, out, t) => {
      tone(c, out, t, { type: "triangle", f0: 783.99, dur: 0.16, peak: 0.22 });
      tone(c, out, t + 0.1, { type: "triangle", f0: 1174.66, dur: 0.32, peak: 0.24 });
      tone(c, out, t + 0.1, { type: "sine", f0: 2349.3, dur: 0.25, peak: 0.06 });
    });
  },
};
