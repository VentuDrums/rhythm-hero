// Página de muestra (T6): todas las figuras y silencios, y los colores de resultado.
import { applyTranslations, type MessageKey } from '../i18n';
import type { Exercise, RhythmEvent } from '../rhythm/types';
import type { Judgement } from '../scoring/score';

const q: RhythmEvent = { duration: 'quarter' };
const e: RhythmEvent = { duration: 'eighth' };
const s: RhythmEvent = { duration: 'sixteenth' };
const rest = (duration: RhythmEvent['duration']): RhythmEvent => ({ duration, rest: true });

export const SAMPLES: { key: MessageKey; exercise: Exercise }[] = [
  {
    key: 'notation.sample.basic',
    exercise: {
      timeSignature: { beats: 4, beatUnit: 4 },
      bpm: 80,
      measures: [[{ duration: 'whole' }], [{ duration: 'half' }, { duration: 'half' }], [q, q, q, q], [e, e, e, e, e, e, q]],
    },
  },
  {
    key: 'notation.sample.rests',
    exercise: {
      timeSignature: { beats: 4, beatUnit: 4 },
      bpm: 80,
      measures: [[rest('whole')], [rest('half'), { duration: 'half' }], [q, rest('quarter'), q, rest('quarter')], [e, rest('eighth'), e, rest('eighth'), q, q]],
    },
  },
  {
    key: 'notation.sample.small',
    exercise: {
      timeSignature: { beats: 2, beatUnit: 4 },
      bpm: 80,
      measures: [[s, s, s, s, q], [e, s, s, s, s, e], [e, q, e], [q, rest('quarter')]],
    },
  },
  {
    key: 'notation.sample.dotted',
    exercise: {
      timeSignature: { beats: 3, beatUnit: 4 },
      bpm: 80,
      measures: [[{ duration: 'half', dotted: true }], [{ duration: 'quarter', dotted: true }, e, q], [q, q, q], [{ duration: 'half' }, rest('quarter')]],
    },
  },
  {
    key: 'notation.sample.compound',
    exercise: {
      timeSignature: { beats: 6, beatUnit: 8 },
      bpm: 60,
      measures: [[e, e, e, e, e, e], [{ duration: 'quarter', dotted: true }, q, e], [{ duration: 'quarter', dotted: true }, rest('quarter'), rest('eighth')], [{ duration: 'half', dotted: true }]],
    },
  },
];

const FEEDBACK: { exercise: Exercise; marks: Judgement[] } = {
  exercise: { timeSignature: { beats: 4, beatUnit: 4 }, bpm: 80, measures: [[q, q, q, q]] },
  marks: ['perfect', 'early', 'late', 'miss'],
};

export function mountNotationPreview(root: HTMLElement): () => void {
  root.className = 'screen';
  const figures = [...SAMPLES.map((sample) => sample.key), 'notation.sample.feedback' as const]
    .map((key) => `<figure class="score-figure"><figcaption data-i18n="${key}"></figcaption><div class="paper" aria-hidden="true"></div></figure>`)
    .join('');
  root.innerHTML = `
    <a class="back" href="#/" data-i18n="nav.back"></a>
    <h1 data-i18n="notation.title" tabindex="-1"></h1>
    <p data-i18n="notation.intro"></p>
    <p id="notation-status" class="note" data-i18n="notation.loading"></p>
    ${figures}
    <p class="note" data-i18n="notation.legend"></p>`;
  applyTranslations(root);

  let alive = true;
  let onResize = (): void => {};
  // La partitura (VexFlow) se descarga solo al entrar aquí, para que la portada cargue rápido.
  void import('../notation/render').then(async ({ loadNotationFont, renderExercise }) => {
    await loadNotationFont();
    if (!alive) return;
    const papers = [...root.querySelectorAll<HTMLDivElement>('.paper')];
    const draw = (): void => {
      SAMPLES.forEach((sample, i) => renderExercise(papers[i] as HTMLDivElement, sample.exercise, { width: (papers[i] as HTMLDivElement).clientWidth }));
      const last = papers[SAMPLES.length] as HTMLDivElement;
      const rendered = renderExercise(last, FEEDBACK.exercise, { width: last.clientWidth, measuresPerRow: 1 });
      FEEDBACK.marks.forEach((judgement, i) => rendered.mark(i, judgement));
    };
    draw();
    root.querySelector('#notation-status')?.remove();
    let timer = 0;
    onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 150);
    };
    window.addEventListener('resize', onResize);
  });

  return () => {
    alive = false;
    window.removeEventListener('resize', onResize);
  };
}
