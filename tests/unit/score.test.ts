import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_OPTIONS, matchHits, scoreRun, starsFor } from '../../src/scoring/score';
import { noteOnsets } from '../../src/rhythm/timeline';
import type { Exercise } from '../../src/rhythm/types';

// Cuatro negras a 60 BPM: una figura por segundo.
const quarters = [0, 1, 2, 3];

describe('scoreRun', () => {
  it('gives 100 % and three stars when every note is played on time', () => {
    const score = scoreRun(quarters, [0.01, 0.99, 2.02, 3]);
    expect(score.notes.map((n) => n.judgement)).toEqual(['perfect', 'perfect', 'perfect', 'perfect']);
    expect(score).toMatchObject({ perfect: 4, good: 0, miss: 0, extra: 0, percent: 100, passed: true, stars: 3 });
  });

  it('is forgiving: up to 75 ms is still perfect', () => {
    const score = scoreRun(quarters, [-0.07, 1.06, 2.074, 2.93]);
    expect(score.notes.map((n) => n.judgement)).toEqual(['perfect', 'perfect', 'perfect', 'perfect']);
    expect(score.percent).toBe(100);
  });

  it('labels hits between 75 and 150 ms as early or late, with the error in ms', () => {
    const score = scoreRun(quarters, [-0.12, 1.1, 2, 3]);
    expect(score.notes[0]).toEqual({ judgement: 'early', errorMs: -120 });
    expect(score.notes[1]).toEqual({ judgement: 'late', errorMs: 100 });
    expect(score.good).toBe(2);
    expect(score.percent).toBe(75); // (1 + 1 + 0.5 + 0.5) / 4
  });

  it('accepts exactly 75 ms as perfect and exactly 150 ms as good', () => {
    expect(DEFAULT_SCORE_OPTIONS).toMatchObject({ perfectS: 0.075, goodS: 0.15 });
    const score = scoreRun([1, 2, 3], [1.075, 2.15, 2.85]);
    expect(score.notes.map((n) => n.judgement)).toEqual(['perfect', 'late', 'early']);
  });

  it('marks notes without a hit within 150 ms as missed', () => {
    const score = scoreRun(quarters, [0, 1.2, 3]);
    expect(score.notes.map((n) => n.judgement)).toEqual(['perfect', 'miss', 'miss', 'perfect']);
    expect(score.notes[1]).toEqual({ judgement: 'miss', errorMs: null });
    expect(score.miss).toBe(2);
    expect(score.extra).toBe(1); // el golpe en 1.2 no vale para ninguna figura
  });

  it('never lets one hit count for two notes', () => {
    // Dos figuras separadas 80 ms y un solo golpe entre ellas.
    const score = scoreRun([1, 1.08], [1.04]);
    expect(score.perfect).toBe(1);
    expect(score.miss).toBe(1);
    expect(score.extra).toBe(0);
  });

  it('subtracts points for extra hits, including hits on a rest', () => {
    // Negra, silencio de negra, negra, negra: en el segundo 1 no se toca.
    const exercise: Exercise = {
      timeSignature: { beats: 4, beatUnit: 4 },
      bpm: 60,
      measures: [[{ duration: 'quarter' }, { duration: 'quarter', rest: true }, { duration: 'quarter' }, { duration: 'quarter' }]],
    };
    const expected = noteOnsets(exercise, 0).map((n) => n.time);
    const clean = scoreRun(expected, [0, 2, 3]);
    const onRest = scoreRun(expected, [0, 1, 2, 3]);
    expect(clean.percent).toBe(100);
    expect(onRest.extra).toBe(1);
    expect(onRest.percent).toBe(83); // (3 - 0.5) / 3
    expect(onRest.stars).toBe(1);
  });

  it('never goes below 0 %', () => {
    const score = scoreRun([0], [0.5, 0.6, 0.7]);
    expect(score.percent).toBe(0);
    expect(score.passed).toBe(false);
    expect(score.stars).toBe(0);
  });

  it('gives 0 % for an exercise with nothing to play', () => {
    expect(scoreRun([], []).percent).toBe(0);
  });

  it('uses the configured windows and pass mark', () => {
    const strict = { perfectS: 0.02, goodS: 0.04, passPercent: 90 };
    const score = scoreRun(quarters, [0.03, 1.05, 2, 3], strict);
    expect(score.notes.map((n) => n.judgement)).toEqual(['late', 'miss', 'perfect', 'perfect']);
    expect(score.percent).toBe(50); // (0.5 + 1 + 1 - 0.5 sobrante) / 4
    expect(score.passed).toBe(false);
  });
});

describe('matchHits', () => {
  it('gives each hit to its closest note first', () => {
    // El golpe en 1.07 está más cerca de la segunda figura; el de 1.0, de la primera.
    expect(matchHits([0.98, 1.08], [1.07, 1.0], 0.1)).toEqual([1, 0]);
  });
});

describe('starsFor', () => {
  it('passes at 70 % by default and gives more stars at 85 and 95 %', () => {
    const pass = DEFAULT_SCORE_OPTIONS.passPercent;
    expect(pass).toBe(70);
    expect([69, 70, 84, 85, 94, 95, 100].map((p) => starsFor(p, pass))).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
});
