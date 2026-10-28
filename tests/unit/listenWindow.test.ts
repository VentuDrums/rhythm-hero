import { describe, expect, it } from 'vitest';
import { acceptOnsets, EARLY_S, isShownOnset, MASK_AFTER_SOUND_S, planTurn } from '../../src/audio/listenWindow';

describe('planTurn', () => {
  it('plays one measure of claves, then listens silently during the student measures', () => {
    // 4/4 a 120 BPM: cada pulso dura 0.5 s y cada compás 2 s.
    const plan = planTurn({ timeSignature: { beats: 4, beatUnit: 4 }, bpm: 120, startTime: 10, studentMeasures: 2 });
    expect(plan.countIn).toEqual([10, 10.5, 11, 11.5]);
    expect(plan.studentBeats).toEqual([12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5]);
    expect(plan.listen).toEqual({ open: 12 - EARLY_S, close: 16 });
    expect(plan.end).toBe(16);
  });

  it('counts 6/8 in two dotted-quarter beats', () => {
    const plan = planTurn({ timeSignature: { beats: 6, beatUnit: 8 }, bpm: 60, startTime: 0, studentMeasures: 1 });
    expect(plan.countIn).toEqual([0, 1]);
    expect(plan.studentBeats).toEqual([2, 3]);
  });
});

describe('acceptOnsets', () => {
  const listen = { open: 2, close: 4 };

  it('keeps only claps inside the listening window', () => {
    expect(acceptOnsets([1.9, 2.1, 3.5, 4.1], [listen], [])).toEqual([2.1, 3.5]);
  });

  it('drops claps right after a sound the app made, as a safety net', () => {
    const appSound = 2.5;
    expect(acceptOnsets([2.55, appSound + MASK_AFTER_SOUND_S + 0.01], [listen], [appSound])).toEqual([
      appSound + MASK_AFTER_SOUND_S + 0.01,
    ]);
  });

  it('opens early enough to accept a clap up to 100 ms ahead of the first beat', () => {
    expect(EARLY_S).toBeGreaterThanOrEqual(0.1);
  });
});

describe('isShownOnset', () => {
  // Claves en 10, 10.5, 11 y 11.5; turno del alumno de 12 a 16.
  const plan = planTurn({ timeSignature: { beats: 4, beatUnit: 4 }, bpm: 120, startTime: 10, studentMeasures: 2 });

  it('shows every clap when no turn is running, so the mic can be tested freely', () => {
    expect(isShownOnset(3, null)).toBe(true);
  });

  it('shows claps before and after the turn', () => {
    expect(isShownOnset(9, plan)).toBe(true);
    expect(isShownOnset(16.5, plan)).toBe(true);
  });

  it('hides what the mic hears during the claves, even with the speaker loud', () => {
    expect(plan.countIn.map((t) => isShownOnset(t + 0.01, plan))).toEqual([false, false, false, false]);
  });

  it('shows the claps of the student turn', () => {
    expect(isShownOnset(12, plan)).toBe(true);
    expect(isShownOnset(15.9, plan)).toBe(true);
  });
});
