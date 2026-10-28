import { describe, expect, it } from 'vitest';
import { ReadAndPlayRun } from '../../src/modes/readAndPlay';
import { xAtTicks } from '../../src/notation/scroll';
import { TICKS_PER_QUARTER } from '../../src/rhythm/duration';
import type { Exercise, RhythmEvent } from '../../src/rhythm/types';

const q: RhythmEvent = { duration: 'quarter' };
// 2 compases de negras en 4/4 a 60 BPM: una parte por segundo.
const twoBars: Exercise = { timeSignature: { beats: 4, beatUnit: 4 }, bpm: 60, measures: [[q, q, q, q], [q, q, q, q]] };

describe('ReadAndPlayRun', () => {
  it('plays one measure of claves before the student turn and expects every note after it', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    expect(run.plan.countIn).toEqual([10, 11, 12, 13]);
    expect(run.studentStart).toBe(14);
    expect(run.expected).toEqual([14, 15, 16, 17, 18, 19, 20, 21]);
    expect(run.end).toBeCloseTo(22.1);
  });

  it('scores a perfect run from simulated claps', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    const live = run.expected.map((t) => run.hit(t + 0.01));
    expect(live.map((m) => m?.judgement)).toEqual(Array(8).fill('perfect'));
    expect(live.map((m) => m?.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(run.finish()).toMatchObject({ percent: 100, stars: 3, passed: true });
  });

  it('ignores what the mic hears during the claves', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    expect(run.plan.countIn.map((t) => run.hit(t + 0.02))).toEqual([null, null, null, null]);
    expect(run.finish().extra).toBe(0);
  });

  it('accepts a slightly early first clap and a late last one', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    expect(run.hit(13.92)).toEqual({ index: 0, judgement: 'early' });
    expect(run.hit(21.09)).toEqual({ index: 7, judgement: 'late' });
  });

  it('subtracts the calibrated latency from every clap', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10, latencyS: 0.08 });
    expect(run.hit(14.08)).toEqual({ index: 0, judgement: 'perfect' });
    expect(run.finish().notes[0]?.errorMs).toBe(0);
  });

  it('marks a note as missed live once its window has passed', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    run.hit(14);
    expect(run.missesUntil(15.05)).toEqual([]);
    expect(run.missesUntil(15.2)).toEqual([{ index: 1, judgement: 'miss' }]);
    expect(run.missesUntil(15.3)).toEqual([]); // no se repite
    expect(run.hit(15.15)).toBeNull(); // ni un golpe tardío la recupera
  });

  it('counts claps that match no note as extra in the final score', () => {
    const run = new ReadAndPlayRun(twoBars, { startTime: 10 });
    run.expected.forEach((t) => run.hit(t));
    expect(run.hit(14.5)).toBeNull();
    expect(run.finish()).toMatchObject({ extra: 1, percent: 94 });
  });

  it('follows the audio clock without drift over 16 measures', () => {
    const long: Exercise = { timeSignature: { beats: 4, beatUnit: 4 }, bpm: 97, measures: Array.from({ length: 16 }, () => [q, q, q, q]) };
    const run = new ReadAndPlayRun(long, { startTime: 3.3 });
    const beat = 60 / 97;
    expect(run.ticksAt(run.studentStart - 4 * beat)).toBeCloseTo(-4 * TICKS_PER_QUARTER, 6);
    expect(run.ticksAt(run.studentStart)).toBe(0);
    // Última negra del compás 16: 63 partes después del comienzo, sin error acumulado.
    expect(run.ticksAt(run.expected[63] as number)).toBeCloseTo(63 * TICKS_PER_QUARTER, 6);
  });
});

describe('xAtTicks', () => {
  const anchors = [
    { ticks: 0, x: 50 },
    { ticks: 48, x: 100 },
    { ticks: 96, x: 300 },
  ];

  it('lands exactly on each drawn note', () => {
    expect(anchors.map((a) => xAtTicks(anchors, a.ticks, 1))).toEqual([50, 100, 300]);
  });

  it('moves smoothly between notes', () => {
    expect(xAtTicks(anchors, 24, 1)).toBe(75);
    expect(xAtTicks(anchors, 72, 1)).toBe(200);
  });

  it('keeps going in a straight line before the first note and after the end', () => {
    expect(xAtTicks(anchors, -48, 2)).toBe(-46);
    expect(xAtTicks(anchors, 106, 2)).toBe(320);
  });

  it('returns 0 when there is nothing drawn', () => {
    expect(xAtTicks([], 10, 1)).toBe(0);
  });
});
