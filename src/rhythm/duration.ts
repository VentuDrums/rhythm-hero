import type { Duration, RhythmEvent, TimeSignature } from './types';

/** Las duraciones se cuentan en "ticks" enteros para que las sumas sean exactas (sin errores de coma flotante). */
export const TICKS_PER_QUARTER = 48;

const BASE_TICKS: Record<Duration, number> = {
  whole: 4 * TICKS_PER_QUARTER,
  half: 2 * TICKS_PER_QUARTER,
  quarter: TICKS_PER_QUARTER,
  eighth: TICKS_PER_QUARTER / 2,
  sixteenth: TICKS_PER_QUARTER / 4,
};

export function eventTicks(event: RhythmEvent): number {
  const base = BASE_TICKS[event.duration];
  return event.dotted ? base * 1.5 : base;
}

export function measureTicks(ts: TimeSignature): number {
  return (ts.beats * 4 * TICKS_PER_QUARTER) / ts.beatUnit;
}

/** Ticks que dura un pulso: negra en x/4, negra con puntillo en 6/8 (compás compuesto). */
export function beatTicks(ts: TimeSignature): number {
  return ts.beatUnit === 8 ? 1.5 * TICKS_PER_QUARTER : TICKS_PER_QUARTER;
}

export function beatsPerMeasure(ts: TimeSignature): number {
  return measureTicks(ts) / beatTicks(ts);
}

export function secondsPerTick(ts: TimeSignature, bpm: number): number {
  return 60 / bpm / beatTicks(ts);
}
