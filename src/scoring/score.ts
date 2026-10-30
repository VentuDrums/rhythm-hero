// Puntuación (SPEC.md, "Mecánica y puntuación"): cada figura se empareja con un golpe como mucho,
// y cada golpe vale para una figura como mucho. Los golpes que sobran, también los que caen en un silencio, restan.

export type Judgement = 'perfect' | 'early' | 'late' | 'miss';

export interface NoteResult {
  judgement: Judgement;
  /** Golpe menos figura, en ms (negativo = adelantado). null si no se tocó. */
  errorMs: number | null;
}

export interface ScoreOptions {
  /** Ventana de "perfecto" en segundos (±). */
  perfectS: number;
  /** Ventana de "bien" en segundos (±). Fuera de ella es fallo. */
  goodS: number;
  /** % mínimo para superar el nivel. */
  passPercent: number;
}

/** Ventanas pensadas para alumnado de ESO: permisivas para no frustrar (petición de Carlos, 2026-10-30). */
export const DEFAULT_SCORE_OPTIONS: ScoreOptions = { perfectS: 0.075, goodS: 0.15, passPercent: 70 };

/** Puntos de cada resultado. Un golpe sobrante resta lo mismo que vale un "bien". */
const POINTS = { perfect: 1, good: 0.5, extra: -0.5 };

export interface RunScore {
  notes: NoteResult[];
  perfect: number;
  good: number;
  miss: number;
  extra: number;
  /** 0–100, redondeado. */
  percent: number;
  passed: boolean;
  /** 0 si no se supera; 1–3 si se supera. */
  stars: 0 | 1 | 2 | 3;
}

/** Empareja golpes y figuras: primero las parejas más cercanas, para que un golpe no robe la figura de otro. */
export function matchHits(expected: number[], hits: number[], windowS: number): (number | null)[] {
  const pairs: { note: number; hit: number; distance: number }[] = [];
  expected.forEach((time, note) => {
    hits.forEach((hitTime, hit) => {
      const distance = Math.abs(hitTime - time);
      if (distance <= windowS) pairs.push({ note, hit, distance });
    });
  });
  pairs.sort((a, b) => a.distance - b.distance);
  const byNote: (number | null)[] = expected.map(() => null);
  const usedHits = new Set<number>();
  for (const { note, hit } of pairs) {
    if (byNote[note] !== null || usedHits.has(hit)) continue;
    byNote[note] = hit;
    usedHits.add(hit);
  }
  return byNote;
}

/** Margen mínimo para que el límite exacto (p. ej. 75 ms) no se pierdan por el redondeo de los decimales. */
const EPSILON_S = 1e-9;

export function judge(errorS: number, options: ScoreOptions): Judgement {
  if (Math.abs(errorS) <= options.perfectS + EPSILON_S) return 'perfect';
  return errorS < 0 ? 'early' : 'late';
}

export function starsFor(percent: number, passPercent: number): RunScore['stars'] {
  if (percent < passPercent) return 0;
  if (percent >= 95) return 3;
  if (percent >= 85) return 2;
  return 1;
}

/** Puntúa un intento. expected: instantes de las figuras (sin silencios). hits: golpes ya corregidos de latencia. */
export function scoreRun(expected: number[], hits: number[], options: ScoreOptions = DEFAULT_SCORE_OPTIONS): RunScore {
  const byNote = matchHits(expected, hits, options.goodS + EPSILON_S);
  const notes = byNote.map((hit, note): NoteResult => {
    if (hit === null) return { judgement: 'miss', errorMs: null };
    const errorS = (hits[hit] as number) - (expected[note] as number);
    return { judgement: judge(errorS, options), errorMs: Math.round(errorS * 1000) };
  });
  const perfect = notes.filter((n) => n.judgement === 'perfect').length;
  const good = notes.filter((n) => n.judgement === 'early' || n.judgement === 'late').length;
  const matched = perfect + good;
  const extra = hits.length - matched;
  const points = perfect * POINTS.perfect + good * POINTS.good + extra * POINTS.extra;
  const percent = expected.length === 0 ? 0 : Math.round(Math.max(0, points / expected.length) * 100);
  const stars = starsFor(percent, options.passPercent);
  return { notes, perfect, good, miss: expected.length - matched, extra, percent, passed: stars > 0, stars };
}
