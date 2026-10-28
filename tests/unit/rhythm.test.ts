import { describe, expect, it } from 'vitest';
import { beatsPerMeasure, eventTicks, measureTicks, secondsPerTick, TICKS_PER_QUARTER } from '../../src/rhythm/duration';
import { noteOnsets } from '../../src/rhythm/timeline';
import type { Exercise, RhythmEvent, TimeSignature } from '../../src/rhythm/types';
import { validateExercise } from '../../src/rhythm/validate';

const q: RhythmEvent = { duration: 'quarter' };
const e: RhythmEvent = { duration: 'eighth' };
const s: RhythmEvent = { duration: 'sixteenth' };
const h: RhythmEvent = { duration: 'half' };
const w: RhythmEvent = { duration: 'whole' };
const qRest: RhythmEvent = { duration: 'quarter', rest: true };
const dq: RhythmEvent = { duration: 'quarter', dotted: true };
const dh: RhythmEvent = { duration: 'half', dotted: true };

const ts = (beats: number, beatUnit: 4 | 8): TimeSignature => ({ beats, beatUnit });
const exercise = (timeSignature: TimeSignature, bpm: number, measures: RhythmEvent[][]): Exercise => ({
  timeSignature,
  bpm,
  measures,
});

describe('durations', () => {
  it('measures every figure in ticks, dots add half', () => {
    expect(eventTicks(w)).toBe(4 * TICKS_PER_QUARTER);
    expect(eventTicks(h)).toBe(2 * TICKS_PER_QUARTER);
    expect(eventTicks(q)).toBe(TICKS_PER_QUARTER);
    expect(eventTicks(e)).toBe(TICKS_PER_QUARTER / 2);
    expect(eventTicks(s)).toBe(TICKS_PER_QUARTER / 4);
    expect(eventTicks(dq)).toBe(1.5 * TICKS_PER_QUARTER);
    expect(eventTicks(dh)).toBe(3 * TICKS_PER_QUARTER);
    expect(eventTicks({ duration: 'eighth', dotted: true })).toBe(0.75 * TICKS_PER_QUARTER);
  });

  it('knows how long a measure is in each time signature', () => {
    expect(measureTicks(ts(2, 4))).toBe(2 * TICKS_PER_QUARTER);
    expect(measureTicks(ts(3, 4))).toBe(3 * TICKS_PER_QUARTER);
    expect(measureTicks(ts(4, 4))).toBe(4 * TICKS_PER_QUARTER);
    expect(measureTicks(ts(6, 8))).toBe(3 * TICKS_PER_QUARTER);
  });

  it('counts beats per measure (6/8 has two dotted-quarter beats)', () => {
    expect(beatsPerMeasure(ts(2, 4))).toBe(2);
    expect(beatsPerMeasure(ts(3, 4))).toBe(3);
    expect(beatsPerMeasure(ts(4, 4))).toBe(4);
    expect(beatsPerMeasure(ts(6, 8))).toBe(2);
  });

  it('uses the quarter as the beat in x/4 and the dotted quarter in 6/8', () => {
    // 60 BPM in 4/4: a quarter lasts 1 s.
    expect(secondsPerTick(ts(4, 4), 60) * TICKS_PER_QUARTER).toBeCloseTo(1);
    // 60 BPM in 6/8: a dotted quarter lasts 1 s, so a quarter lasts 2/3 s.
    expect(secondsPerTick(ts(6, 8), 60) * TICKS_PER_QUARTER * 1.5).toBeCloseTo(1);
  });
});

describe('noteOnsets', () => {
  it('places quarters on the beat and skips rests', () => {
    const onsets = noteOnsets(exercise(ts(4, 4), 120, [[q, qRest, q, q]]), 10);
    expect(onsets.map((o) => o.time)).toEqual([10, 11, 11.5]);
    expect(onsets.map((o) => [o.measure, o.index])).toEqual([
      [0, 0],
      [0, 2],
      [0, 3],
    ]);
  });

  it('continues across measures with mixed figures and dots', () => {
    // 60 BPM 3/4: | negra con puntillo, corchea, negra | blanca con puntillo |
    const onsets = noteOnsets(exercise(ts(3, 4), 60, [[dq, e, q], [dh]]), 0);
    expect(onsets.map((o) => o.time)).toEqual([0, 1.5, 2, 3]);
  });

  it('handles sixteenths and 6/8', () => {
    const sixteenths = noteOnsets(exercise(ts(2, 4), 60, [[s, s, s, s, q]]), 0);
    expect(sixteenths.map((o) => o.time)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    // 6/8 at 60 BPM: six eighths fill 2 beats of 1 s, each eighth = 1/3 s.
    const sixEight = noteOnsets(exercise(ts(6, 8), 60, [[e, e, e, e, e, e]]), 0);
    sixEight.forEach((o, i) => expect(o.time).toBeCloseTo(i / 3));
  });
});

describe('validateExercise', () => {
  it('accepts complete measures', () => {
    expect(validateExercise(exercise(ts(4, 4), 80, [[q, q, h], [w]]))).toEqual([]);
    expect(validateExercise(exercise(ts(6, 8), 80, [[dq, e, e, e]]))).toEqual([]);
  });

  it('reports incomplete and overfull measures with their position', () => {
    const errors = validateExercise(exercise(ts(3, 4), 80, [[q, q, q], [q, q], [h, h]]));
    expect(errors).toEqual([
      { kind: 'measure-length', measure: 1, expectedTicks: 3 * TICKS_PER_QUARTER, actualTicks: 2 * TICKS_PER_QUARTER },
      { kind: 'measure-length', measure: 2, expectedTicks: 3 * TICKS_PER_QUARTER, actualTicks: 4 * TICKS_PER_QUARTER },
    ]);
  });

  it('rejects empty exercises and tempos outside 40–160 BPM', () => {
    expect(validateExercise(exercise(ts(4, 4), 80, []))).toEqual([{ kind: 'empty' }]);
    expect(validateExercise(exercise(ts(4, 4), 39, [[w]]))).toEqual([{ kind: 'tempo', bpm: 39 }]);
    expect(validateExercise(exercise(ts(4, 4), 161, [[w]]))).toEqual([{ kind: 'tempo', bpm: 161 }]);
    expect(validateExercise(exercise(ts(4, 4), 40, [[w]]))).toEqual([]);
    expect(validateExercise(exercise(ts(4, 4), 160, [[w]]))).toEqual([]);
  });

  it('rejects an exercise made only of rests (nothing to play)', () => {
    expect(validateExercise(exercise(ts(2, 4), 80, [[qRest, qRest]]))).toEqual([{ kind: 'no-notes' }]);
  });
});
