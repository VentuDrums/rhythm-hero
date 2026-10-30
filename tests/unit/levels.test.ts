import { beforeAll, describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import { getLevel, LEVELS, nextLevel } from '../../src/levels';
import { renderExercise } from '../../src/notation/render';
import { parseEvent, parseMeasures, parseTimeSignature, RhythmSyntaxError } from '../../src/rhythm/parse';
import { validateExercise } from '../../src/rhythm/validate';
import type { Duration } from '../../src/rhythm/types';

describe('parse', () => {
  it('reads figures, dots and rests', () => {
    expect(parseEvent('q')).toEqual({ duration: 'quarter' });
    expect(parseEvent('h.')).toEqual({ duration: 'half', dotted: true });
    expect(parseEvent('8r')).toEqual({ duration: 'eighth', rest: true });
    expect(parseEvent('16')).toEqual({ duration: 'sixteenth' });
    expect(parseEvent('q.r')).toEqual({ duration: 'quarter', dotted: true, rest: true });
    expect(parseEvent('w')).toEqual({ duration: 'whole' });
  });

  it('splits measures with | and ignores extra spaces', () => {
    expect(parseMeasures('  q q h |  w  |')).toEqual([[{ duration: 'quarter' }, { duration: 'quarter' }, { duration: 'half' }], [{ duration: 'whole' }]]);
  });

  it('rejects unknown figures and time signatures', () => {
    expect(() => parseEvent('x')).toThrow(RhythmSyntaxError);
    expect(() => parseEvent('32')).toThrow('Figura desconocida: "32"');
    expect(() => parseTimeSignature('5/4')).toThrow(RhythmSyntaxError);
  });

  it('knows every time signature the game supports', () => {
    expect(['2/4', '3/4', '4/4', '6/8'].map(parseTimeSignature)).toEqual([
      { beats: 2, beatUnit: 4 },
      { beats: 3, beatUnit: 4 },
      { beats: 4, beatUnit: 4 },
      { beats: 6, beatUnit: 8 },
    ]);
  });
});

describe('base levels', () => {
  beforeAll(() => {
    // jsdom no tiene canvas: medidor aproximado (ver notation.test.ts).
    HTMLCanvasElement.prototype.getContext = function getContext() {
      return { font: '', measureText: (text: string) => ({ width: text.length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }) } as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('has 10 to 15 levels with ids 1, 2, 3… in order', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10);
    expect(LEVELS.length).toBeLessThanOrEqual(15);
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i is a valid exercise', (_id, level) => {
    expect(validateExercise(level.exercise)).toEqual([]);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i is drawn with one element per note', (_id, level) => {
    const container = document.createElement('div');
    const rendered = renderExercise(container, level.exercise, { width: 800 });
    expect(rendered.notes).toHaveLength(level.exercise.measures.flat().filter((e) => !e.rest).length);
  });

  it('only uses the base content: whole to eighth notes and rests, no dots, in 2/4, 3/4 and 4/4', () => {
    const allowed: Duration[] = ['whole', 'half', 'quarter', 'eighth'];
    for (const { exercise } of LEVELS) {
      expect(exercise.timeSignature.beatUnit).toBe(4);
      for (const event of exercise.measures.flat()) {
        expect(allowed).toContain(event.duration);
        expect(event.dotted).toBeUndefined();
      }
    }
    const signatures = new Set(LEVELS.map((l) => l.exercise.timeSignature.beats));
    expect([...signatures].sort()).toEqual([2, 3, 4]);
  });

  it('starts with quarter notes in 4/4 at 80 BPM (success criterion 3)', () => {
    expect(LEVELS[0]?.exercise).toMatchObject({ timeSignature: { beats: 4, beatUnit: 4 }, bpm: 80 });
    expect(LEVELS[0]?.exercise.measures.flat().every((e) => e.duration === 'quarter' && !e.rest)).toBe(true);
  });

  it('has a title in both languages for every level', () => {
    for (const { id } of LEVELS) {
      expect(es).toHaveProperty(`level.title.${id}`);
      expect(en).toHaveProperty(`level.title.${id}`);
    }
  });

  it('finds levels and the one that comes next', () => {
    expect(getLevel(3)?.id).toBe(3);
    expect(getLevel(99)).toBeUndefined();
    expect(nextLevel(1)?.id).toBe(2);
    expect(nextLevel(LEVELS.length)).toBeUndefined();
    expect(nextLevel(99)).toBeUndefined();
  });
});
