// Calibración (SPEC.md): tras 1 compás de claves, el alumno da 8 palmas en silencio siguiendo el pulso visual.
// El retraso es la mediana de (palma − pulso), sin contar los valores atípicos. Incluye el retraso del altavoz,
// del micrófono, del detector y la forma de tocar de cada uno.

export const CALIBRATION_CLAPS = 8;
/** Mínimo de palmas válidas para fiarse del resultado. */
export const MIN_VALID_CLAPS = 6;
/** Una palma a más de esto de la mediana se considera atípica (se ignora). */
export const OUTLIER_S = 0.06;
/** Si las palmas válidas se separan más que esto de la mediana (de media), hay que repetir. */
export const MAX_SPREAD_S = 0.03;
/** Límites razonables del retraso: fuera de ellos algo ha ido mal. */
export const MIN_LATENCY_S = -0.1;
export const MAX_LATENCY_S = 0.4;

export type CalibrationResult =
  | { ok: true; latencyS: number; used: number }
  | { ok: false; reason: 'few' | 'spread' | 'range' };

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Diferencia de cada pulso con la palma más cercana (dentro de medio pulso). Un pulso sin palma no cuenta. */
export function clapOffsets(beats: number[], claps: number[]): number[] {
  if (beats.length < 2) return [];
  const halfBeat = ((beats[1] as number) - (beats[0] as number)) / 2;
  const offsets: number[] = [];
  for (const beat of beats) {
    const nearest = claps.reduce<number | null>((best, c) => (best === null || Math.abs(c - beat) < Math.abs(best - beat) ? c : best), null);
    if (nearest !== null && Math.abs(nearest - beat) < halfBeat) offsets.push(nearest - beat);
  }
  return offsets;
}

export function computeLatency(beats: number[], claps: number[]): CalibrationResult {
  const offsets = clapOffsets(beats, claps);
  if (offsets.length < MIN_VALID_CLAPS) return { ok: false, reason: 'few' };
  const rough = median(offsets);
  const valid = offsets.filter((d) => Math.abs(d - rough) <= OUTLIER_S);
  if (valid.length < MIN_VALID_CLAPS) return { ok: false, reason: 'spread' };
  const latencyS = median(valid);
  const spread = valid.reduce((sum, d) => sum + Math.abs(d - latencyS), 0) / valid.length;
  if (spread > MAX_SPREAD_S) return { ok: false, reason: 'spread' };
  if (latencyS < MIN_LATENCY_S || latencyS > MAX_LATENCY_S) return { ok: false, reason: 'range' };
  return { ok: true, latencyS, used: valid.length };
}
