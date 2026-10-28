// Modo "Leer y tocar": la lógica de una partida, sin pantalla ni audio, para poder probarla con un reloj simulado.
// Regla de turnos: 1 compás de claves y después silencio; solo cuentan los golpes del turno del alumno.
import { acceptOnsets, planTurn, type TurnPlan } from '../audio/listenWindow';
import { secondsPerTick } from '../rhythm/duration';
import { noteOnsets } from '../rhythm/timeline';
import type { Exercise } from '../rhythm/types';
import { DEFAULT_SCORE_OPTIONS, judge, scoreRun, type Judgement, type RunScore, type ScoreOptions } from '../scoring/score';

export interface RunOptions {
  /** Instante (reloj de audio) de la primera clave. */
  startTime: number;
  /** Retraso medido en la calibración: se resta a cada golpe. */
  latencyS?: number;
  score?: ScoreOptions;
}

export interface LiveMark {
  index: number;
  judgement: Judgement;
}

export class ReadAndPlayRun {
  readonly plan: TurnPlan;
  /** Instante de cada figura que se toca (sin silencios). */
  readonly expected: number[];
  /** Comienzo del turno del alumno (primera parte del primer compás). */
  readonly studentStart: number;
  private readonly hits: number[] = [];
  private readonly marks: (Judgement | null)[];
  private readonly latencyS: number;
  private readonly options: ScoreOptions;
  private readonly tickSeconds: number;

  constructor(
    readonly exercise: Exercise,
    options: RunOptions,
  ) {
    this.latencyS = options.latencyS ?? 0;
    this.options = options.score ?? DEFAULT_SCORE_OPTIONS;
    this.plan = planTurn({
      timeSignature: exercise.timeSignature,
      bpm: exercise.bpm,
      startTime: options.startTime,
      studentMeasures: exercise.measures.length,
    });
    this.studentStart = this.plan.studentBeats[0] as number;
    this.expected = noteOnsets(exercise, this.studentStart).map((n) => n.time);
    this.marks = this.expected.map(() => null);
    this.tickSeconds = secondsPerTick(exercise.timeSignature, exercise.bpm);
  }

  /** Último instante en que aún puede llegar un golpe que cuente. */
  get end(): number {
    return this.plan.end + this.options.goodS;
  }

  /**
   * Registra un golpe del micrófono (reloj de audio). Devuelve la figura que se ilumina en directo, si hay alguna.
   * El resultado definitivo lo da finish(), que reparte los golpes de forma óptima.
   */
  hit(rawTime: number): LiveMark | null {
    const listen = { open: this.plan.listen.open, close: this.end };
    if (acceptOnsets([rawTime], [listen], this.plan.countIn).length === 0) return null;
    const time = rawTime - this.latencyS;
    this.hits.push(time);
    let best: number | null = null;
    this.expected.forEach((noteTime, index) => {
      if (this.marks[index] !== null || Math.abs(time - noteTime) > this.options.goodS) return;
      if (best === null || Math.abs(time - noteTime) < Math.abs(time - (this.expected[best] as number))) best = index;
    });
    if (best === null) return null;
    const judgement = judge(time - (this.expected[best] as number), this.options);
    this.marks[best] = judgement;
    return { index: best, judgement };
  }

  /** Figuras que ya no pueden tocarse a tiempo en el instante now y no se tocaron: se marcan como fallo. */
  missesUntil(now: number): LiveMark[] {
    const missed: LiveMark[] = [];
    this.expected.forEach((noteTime, index) => {
      if (this.marks[index] === null && now - this.latencyS > noteTime + this.options.goodS) {
        this.marks[index] = 'miss';
        missed.push({ index, judgement: 'miss' });
      }
    });
    return missed;
  }

  finish(): RunScore {
    return scoreRun(this.expected, this.hits, this.options);
  }

  /**
   * Posición musical (en ticks desde el inicio del turno del alumno) para el instante now.
   * Es negativa durante la cuenta previa. Se calcula siempre desde el reloj de audio, así que no acumula deriva.
   */
  ticksAt(now: number): number {
    return (now - this.studentStart) / this.tickSeconds;
  }
}
