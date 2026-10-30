// Niveles base (SPEC.md, "Contenido musical"): progresión de redonda a corcheas y sus silencios, en 2/4, 3/4 y 4/4.
// Los títulos están en i18n (level.title.N) para que cambien con el idioma.
import { parseMeasures, parseTimeSignature } from '../rhythm/parse';
import type { Exercise } from '../rhythm/types';
import raw from './base.json';

export interface Level {
  id: number;
  exercise: Exercise;
}

export const LEVELS: Level[] = raw.map((level) => ({
  id: level.id,
  exercise: { timeSignature: parseTimeSignature(level.time), bpm: level.bpm, measures: parseMeasures(level.rhythm) },
}));

export function getLevel(id: number): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevel(id: number): Level | undefined {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index === -1 ? undefined : LEVELS[index + 1];
}
