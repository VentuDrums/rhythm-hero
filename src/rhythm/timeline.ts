import { eventTicks, secondsPerTick } from './duration';
import type { Exercise, NoteOnset } from './types';

/** Devuelve el instante (s) de cada figura que hay que tocar, empezando en startTime. Los silencios no generan golpe. */
export function noteOnsets(exercise: Exercise, startTime: number): NoteOnset[] {
  const tickSeconds = secondsPerTick(exercise.timeSignature, exercise.bpm);
  const onsets: NoteOnset[] = [];
  let ticks = 0;
  exercise.measures.forEach((events, measure) => {
    events.forEach((event, index) => {
      if (!event.rest) onsets.push({ time: startTime + ticks * tickSeconds, measure, index });
      ticks += eventTicks(event);
    });
  });
  return onsets;
}
