import { eventTicks, measureTicks } from './duration';
import type { Exercise } from './types';

export const MIN_BPM = 40;
export const MAX_BPM = 160;

export type ValidationError =
  | { kind: 'empty' }
  | { kind: 'no-notes' }
  | { kind: 'tempo'; bpm: number }
  | { kind: 'measure-length'; measure: number; expectedTicks: number; actualTicks: number };

/** Lista los problemas del ejercicio. Una lista vacía significa que es válido. */
export function validateExercise(exercise: Exercise): ValidationError[] {
  const errors: ValidationError[] = [];
  if (exercise.measures.length === 0) return [{ kind: 'empty' }];
  if (exercise.bpm < MIN_BPM || exercise.bpm > MAX_BPM) errors.push({ kind: 'tempo', bpm: exercise.bpm });

  const expectedTicks = measureTicks(exercise.timeSignature);
  exercise.measures.forEach((events, measure) => {
    const actualTicks = events.reduce((sum, e) => sum + eventTicks(e), 0);
    if (actualTicks !== expectedTicks) errors.push({ kind: 'measure-length', measure, expectedTicks, actualTicks });
  });

  if (errors.length === 0 && exercise.measures.every((events) => events.every((e) => e.rest))) {
    errors.push({ kind: 'no-notes' });
  }
  return errors;
}
