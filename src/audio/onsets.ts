// Detector de golpes (palmas, mesa) a partir de la energía de la señal.
// Es lógica pura: no sabe nada de micrófonos ni de Web Audio, así que se prueba con audio sintético
// y se reutiliza tal cual dentro del AudioWorklet.

export interface OnsetOptions {
  /** Tiempo mínimo entre dos golpes (s). Evita contar dos veces una palmada o su eco. */
  refractoryS?: number;
  /** Cuántas veces debe superar la energía al ruido de fondo para contar como golpe. */
  ratio?: number;
  /** Nivel mínimo (RMS) para considerar un golpe, aunque el fondo sea silencio. */
  minRms?: number;
  /** Rapidez (s) con que el detector se adapta al ruido de fondo. */
  backgroundTimeS?: number;
}

const DEFAULTS: Required<OnsetOptions> = {
  refractoryS: 0.08,
  ratio: 4,
  minRms: 0.02,
  backgroundTimeS: 0.5,
};

const FRAME = 128;
const RISE = 2;

export class OnsetDetector {
  private readonly opts: Required<OnsetOptions>;
  private readonly bgAlpha: number;
  private readonly frame = new Float32Array(FRAME);
  private readonly prevFrame = new Float32Array(FRAME);
  private fill = 0;
  private frameStart = 0;
  private background: number | null = null;
  private prevEnergy = 0;
  private lastOnset = -Infinity;

  constructor(
    private readonly sampleRate: number,
    options: OnsetOptions = {},
  ) {
    this.opts = { ...DEFAULTS, ...options };
    this.bgAlpha = 1 - Math.exp(-FRAME / sampleRate / this.opts.backgroundTimeS);
  }

  /** Procesa un bloque de muestras que empieza en blockStartTime (s). Devuelve los golpes detectados en él. */
  process(block: Float32Array, blockStartTime: number): number[] {
    const found: number[] = [];
    for (let i = 0; i < block.length; i++) {
      if (this.fill === 0) this.frameStart = blockStartTime + i / this.sampleRate;
      this.frame[this.fill++] = block[i] as number;
      if (this.fill === FRAME) {
        const onset = this.analyseFrame();
        if (onset !== null) found.push(onset);
        this.prevFrame.set(this.frame);
        this.fill = 0;
      }
    }
    return found;
  }

  private analyseFrame(): number | null {
    let energy = 0;
    for (const x of this.frame) energy += x * x;
    energy /= FRAME;

    if (this.background === null) {
      this.background = energy;
      this.prevEnergy = energy;
      return null;
    }

    const { ratio, minRms, refractoryS } = this.opts;
    const inRefractory = this.frameStart - this.lastOnset < refractoryS;
    // Un golpe es una subida brusca: la cola de un sonido que se apaga no cuenta aunque siga fuerte.
    const rising = energy > RISE * this.prevEnergy;
    const isOnset = !inRefractory && rising && energy > ratio * this.background && energy > minRms * minRms;
    this.prevEnergy = energy;

    if (isOnset) {
      const time = this.refineOnsetTime();
      this.lastOnset = time;
      return time;
    }
    // El fondo solo aprende de lo que no es golpe, para no volverse sordo justo después de una palmada.
    if (!inRefractory) this.background += this.bgAlpha * (energy - this.background);
    return null;
  }

  /** Busca la primera muestra claramente por encima del fondo, en este fragmento o en el anterior. */
  private refineOnsetTime(): number {
    let peak = 0;
    for (const x of this.frame) peak = Math.max(peak, Math.abs(x));
    // Nunca por encima del pico, así que siempre se encuentra como tarde en el fragmento actual.
    const threshold = Math.min(peak, Math.max(0.3 * peak, 4 * Math.sqrt(this.background ?? 0)));
    const inPrev = this.prevFrame.findIndex((x) => Math.abs(x) >= threshold);
    const index = inPrev !== -1 ? inPrev - FRAME : this.frame.findIndex((x) => Math.abs(x) >= threshold);
    return this.frameStart + index / this.sampleRate;
  }
}

/** Detecta los golpes de una grabación completa. Devuelve sus instantes en segundos. */
export function detectOnsets(samples: Float32Array, sampleRate: number, options?: OnsetOptions): number[] {
  return new OnsetDetector(sampleRate, options).process(samples, 0);
}
