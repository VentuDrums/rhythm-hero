import { beforeAll, describe, expect, it } from 'vitest';
import { renderExercise, toStaveNote } from '../../src/notation/render';
import { validateExercise } from '../../src/rhythm/validate';
import { eventTicks, TICKS_PER_QUARTER } from '../../src/rhythm/duration';
import type { Exercise, RhythmEvent } from '../../src/rhythm/types';
import { SAMPLES } from '../../src/ui/notationPreview';

// jsdom no tiene canvas. VexFlow solo lo usa para medir el ancho de los símbolos,
// así que basta un medidor aproximado; el dibujo real se comprueba en el navegador (E2E).
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return {
      font: '',
      measureText: (text: string) => ({
        width: text.length * 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 8,
        fontBoundingBoxDescent: 2,
      }),
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

function draw(exercise: Exercise, width = 800) {
  const container = document.createElement('div');
  document.body.append(container);
  return { container, rendered: renderExercise(container, exercise, { width }) };
}

const playableCount = (exercise: Exercise) => exercise.measures.flat().filter((e) => !e.rest).length;

describe('renderExercise', () => {
  it.each(SAMPLES.map((s) => [s.key, s.exercise] as const))('draws %s with one element per played note', (_key, exercise) => {
    expect(validateExercise(exercise)).toEqual([]);
    const { container, rendered } = draw(exercise);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(rendered.notes).toHaveLength(playableCount(exercise));
    // Una nota/silencio dibujado por evento, y una barra al menos por compás.
    expect(container.querySelectorAll('.vf-stavenote')).toHaveLength(exercise.measures.flat().length);
    expect(container.querySelectorAll('.vf-stave')).toHaveLength(exercise.measures.length);
  });

  it('beams eighth notes by beat and draws the time signature once', () => {
    const exercise = SAMPLES.find((s) => s.key === 'notation.sample.compound')?.exercise as Exercise;
    const { container } = draw(exercise);
    expect(container.querySelectorAll('.vf-timesignature')).toHaveLength(1);
    // 6/8: las seis corcheas del primer compás van en dos grupos de tres.
    expect(container.querySelectorAll('.vf-beam')).toHaveLength(2);
  });

  it('wraps measures into rows that fit the width', () => {
    const exercise = SAMPLES[0]?.exercise as Exercise; // 4 compases
    const wide = draw(exercise, 1000).rendered.svg.getAttribute('viewBox');
    const narrow = draw(exercise, 300).rendered.svg.getAttribute('viewBox');
    expect(wide).toBe('0 0 1000 110'); // 4 compases en una fila
    expect(narrow).toBe('0 0 300 440'); // 1 compás por fila
  });

  it('gives one scroll anchor per note or rest, plus the end, in order', () => {
    const exercise = SAMPLES[0]?.exercise as Exercise;
    const { anchors } = draw(exercise, 1000).rendered;
    expect(anchors).toHaveLength(exercise.measures.flat().length + 1);
    expect(anchors.at(-1)?.ticks).toBe(4 * 4 * 48);
    anchors.slice(1).forEach((a, i) => {
      expect(a.ticks).toBeGreaterThan((anchors[i] as { ticks: number }).ticks);
      expect(a.x).toBeGreaterThan((anchors[i] as { x: number }).x);
    });
  });

  it('replaces the previous drawing when drawn again', () => {
    const exercise = SAMPLES[0]?.exercise as Exercise;
    const { container } = draw(exercise);
    renderExercise(container, exercise, { width: 500 });
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('colours a note by its result and can change it', () => {
    const exercise = SAMPLES[0]?.exercise as Exercise;
    const { rendered } = draw(exercise);
    rendered.mark(2, 'early');
    expect(rendered.notes[2]?.classList.contains('early')).toBe(true);
    rendered.mark(2, 'perfect');
    expect(rendered.notes[2]?.classList.contains('early')).toBe(false);
    expect(rendered.notes[2]?.classList.contains('perfect')).toBe(true);
    expect(() => rendered.mark(999, 'miss')).not.toThrow();
  });
});

describe('toStaveNote', () => {
  const events: RhythmEvent[] = [
    { duration: 'whole' },
    { duration: 'half', dotted: true },
    { duration: 'quarter', dotted: true },
    { duration: 'eighth', rest: true },
    { duration: 'sixteenth' },
  ];

  it.each(events)('gives VexFlow the same length as the rhythm model: %o', (event) => {
    const quarter = toStaveNote({ duration: 'quarter' }).getTicks().value();
    const note = toStaveNote(event);
    expect(note.getTicks().value() / quarter).toBe(eventTicks(event) / TICKS_PER_QUARTER);
    expect(note.isRest()).toBe(event.rest === true);
  });
});
