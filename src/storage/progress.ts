// Progreso del alumno, solo en este dispositivo: mejor % y estrellas de cada nivel.
// Si localStorage falla o tiene datos raros, se empieza de cero sin romper el juego.
import type { RunScore } from '../scoring/score';

const KEY = 'rhythm-hero.progress';

export interface LevelRecord {
  best: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
}

export type Progress = Record<number, LevelRecord>;

/** Copia en memoria por si el navegador no deja guardar: así al menos dura la sesión. */
let inMemory: Progress = {};

function isRecord(value: unknown): value is LevelRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.best === 'number' &&
    r.best >= 0 &&
    r.best <= 100 &&
    (r.stars === 0 || r.stars === 1 || r.stars === 2 || r.stars === 3) &&
    typeof r.passed === 'boolean'
  );
}

export function loadProgress(): Progress {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { ...inMemory };
  }
  if (raw === null) return { ...inMemory };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const progress: Progress = {};
    for (const [id, record] of Object.entries(parsed)) {
      if (/^\d+$/.test(id) && isRecord(record)) progress[Number(id)] = record;
    }
    return progress;
  } catch {
    return {};
  }
}

/** Guarda un intento. Solo mejora el récord: un intento peor no borra lo conseguido. */
export function recordResult(levelId: number, score: Pick<RunScore, 'percent' | 'stars' | 'passed'>): LevelRecord {
  const progress = loadProgress();
  const old = progress[levelId];
  const record: LevelRecord = {
    best: Math.max(old?.best ?? 0, score.percent),
    stars: Math.max(old?.stars ?? 0, score.stars) as LevelRecord['stars'],
    passed: (old?.passed ?? false) || score.passed,
  };
  progress[levelId] = record;
  inMemory = progress;
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Sin almacenamiento: el progreso queda en memoria hasta cerrar la página.
    return record;
  }
  return record;
}

/** Un nivel se puede jugar si es el primero o si el anterior está superado. */
export function isUnlocked(levelIds: number[], levelId: number, progress: Progress): boolean {
  const index = levelIds.indexOf(levelId);
  if (index <= 0) return index === 0;
  return progress[levelIds[index - 1] as number]?.passed === true;
}
