// Generadores de audio sintético para probar el detector sin micrófono.
// Reproducibles: usan un generador pseudoaleatorio con semilla.

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Hit {
  time: number;
  /** Amplitud de pico, 0–1. */
  amplitude: number;
  kind: 'clap' | 'table';
}

export interface SceneOptions {
  sampleRate: number;
  duration: number;
  hits: Hit[];
  /** Amplitud del ruido de fondo (ruido blanco), p. ej. 0.01 = aula tranquila. */
  noise?: number;
  /** Eco de la sala: retardo (s) y ganancia. */
  echo?: { delay: number; gain: number };
  seed?: number;
}

/** Palmada: ráfaga de ruido con caída exponencial rápida. Golpe en mesa: tono grave amortiguado con algo de ruido. */
function addHit(out: Float32Array, sampleRate: number, hit: Hit, random: () => number): void {
  const start = Math.round(hit.time * sampleRate);
  const length = Math.round(0.12 * sampleRate);
  for (let i = 0; i < length && start + i < out.length; i++) {
    const t = i / sampleRate;
    const sample =
      hit.kind === 'clap'
        ? (random() * 2 - 1) * Math.exp(-t / 0.012)
        : (Math.sin(2 * Math.PI * 180 * t) * 0.8 + (random() * 2 - 1) * 0.2) * Math.exp(-t / 0.025);
    out[start + i] = (out[start + i] ?? 0) + hit.amplitude * sample;
  }
}

export function renderScene(options: SceneOptions): Float32Array {
  const { sampleRate, duration, hits, noise = 0, echo, seed = 1 } = options;
  const random = rng(seed);
  const out = new Float32Array(Math.round(duration * sampleRate));
  for (const hit of hits) {
    addHit(out, sampleRate, hit, random);
    if (echo) addHit(out, sampleRate, { ...hit, time: hit.time + echo.delay, amplitude: hit.amplitude * echo.gain }, random);
  }
  if (noise > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + (random() * 2 - 1) * noise;
  return out;
}

/** Golpes regulares a un tempo, con desviación humana aleatoria y amplitudes variadas. */
export function steadyHits(options: {
  bpm: number;
  count: number;
  start: number;
  kind: Hit['kind'];
  jitter?: number;
  minAmplitude?: number;
  seed?: number;
}): Hit[] {
  const { bpm, count, start, kind, jitter = 0.015, minAmplitude = 0.2, seed = 7 } = options;
  const random = rng(seed);
  return Array.from({ length: count }, (_, i) => ({
    time: start + (i * 60) / bpm + (random() * 2 - 1) * jitter,
    amplitude: minAmplitude + random() * (1 - minAmplitude),
    kind,
  }));
}

/** Empareja detecciones con los golpes reales y resume la precisión del detector. */
export function evaluate(expected: number[], detected: number[], toleranceS = 0.02) {
  const used = new Set<number>();
  let hits = 0;
  let maxError = 0;
  for (const t of expected) {
    let best = -1;
    for (let j = 0; j < detected.length; j++) {
      const d = detected[j] as number;
      if (used.has(j) || Math.abs(d - t) > toleranceS) continue;
      if (best === -1 || Math.abs(d - t) < Math.abs((detected[best] as number) - t)) best = j;
    }
    if (best !== -1) {
      used.add(best);
      hits++;
      maxError = Math.max(maxError, Math.abs((detected[best] as number) - t));
    }
  }
  return {
    recall: hits / expected.length,
    falsePositiveRate: (detected.length - used.size) / Math.max(1, expected.length),
    maxError,
  };
}
