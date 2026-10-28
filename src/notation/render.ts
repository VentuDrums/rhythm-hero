// Dibuja un ejercicio como partitura rítmica de una línea con VexFlow (SPEC.md, "Contenido musical").
import { Barline, Beam, Dot, Font, Formatter, Renderer, Stave, StaveNote, VexFlow, Voice } from 'vexflow/core';
import { Gonville } from 'vexflow-gonville';
import type { Judgement } from '../scoring/score';
import type { Duration, Exercise, RhythmEvent } from '../rhythm/types';

const VF_DURATION: Record<Duration, string> = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', sixteenth: '16' };

/** Línea central del pentagrama: es la única que se ve. */
const LINE_KEY = 'b/4';
const ONLY_MIDDLE_LINE = [false, false, true, false, false].map((visible) => ({ visible }));

let fontReady: Promise<void> | null = null;

/** Carga la fuente musical (Gonville, 22 kB) una sola vez. Hay que esperarla antes de dibujar. */
export function loadNotationFont(): Promise<void> {
  fontReady ??= Font.load('Gonville', Gonville, { display: 'block' }).then(() => {
    VexFlow.setFonts('Gonville');
  });
  return fontReady;
}

export function toStaveNote(event: RhythmEvent): StaveNote {
  const duration = VF_DURATION[event.duration] + (event.dotted ? 'd' : '') + (event.rest ? 'r' : '');
  const note = new StaveNote({ keys: [LINE_KEY], duration, stemDirection: 1 });
  if (event.dotted) Dot.buildAndAttach([note], { all: true });
  return note;
}

export interface RenderOptions {
  /** Ancho disponible en píxeles. */
  width: number;
  /** Compases por fila. Por defecto, los que quepan con unos 220 px cada uno. */
  measuresPerRow?: number;
}

export interface RenderedExercise {
  svg: SVGSVGElement;
  /** Un elemento por figura que se toca (sin silencios), en orden. */
  notes: SVGElement[];
  /** Colorea la figura n según el resultado. */
  mark(index: number, judgement: Judgement): void;
}

const ROW_HEIGHT = 110;
const FIRST_MEASURE_EXTRA = 40; // hueco para el compás (4/4, 6/8…)

/** Dibuja el ejercicio dentro de container (que se vacía antes). Requiere loadNotationFont() resuelto. */
export function renderExercise(container: HTMLDivElement, exercise: Exercise, options: RenderOptions): RenderedExercise {
  container.replaceChildren();
  const { beats, beatUnit } = exercise.timeSignature;
  const timeSig = `${beats}/${beatUnit}`;
  const perRow = Math.max(1, options.measuresPerRow ?? Math.floor((options.width - FIRST_MEASURE_EXTRA) / 220));
  const rows = Math.ceil(exercise.measures.length / perRow);

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(options.width, rows * ROW_HEIGHT);
  const context = renderer.getContext();
  const measureWidth = (options.width - FIRST_MEASURE_EXTRA - 2) / perRow;

  const playable: StaveNote[] = [];
  exercise.measures.forEach((events, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const first = col === 0;
    const x = first ? 0 : FIRST_MEASURE_EXTRA + col * measureWidth;
    const stave = new Stave(x, row * ROW_HEIGHT, measureWidth + (first ? FIRST_MEASURE_EXTRA : 0));
    stave.setConfigForLines(ONLY_MIDDLE_LINE);
    if (i === 0) stave.addTimeSignature(timeSig);
    if (i === exercise.measures.length - 1) stave.setEndBarType(Barline.type.END);
    stave.setContext(context).draw();

    const notes = events.map(toStaveNote);
    const beams = Beam.generateBeams(notes, { groups: Beam.getDefaultBeamGroups(timeSig), stemDirection: 1 });
    const voice = new Voice({ numBeats: beats, beatValue: beatUnit }).addTickables(notes);
    new Formatter().joinVoices([voice]).formatToStave([voice], stave);
    voice.draw(context, stave);
    beams.forEach((beam) => beam.setContext(context).draw());
    events.forEach((event, j) => {
      if (!event.rest) playable.push(notes[j] as StaveNote);
    });
  });

  const svg = container.querySelector('svg') as SVGSVGElement;
  svg.setAttribute('class', 'score');
  svg.setAttribute('viewBox', `0 0 ${options.width} ${rows * ROW_HEIGHT}`);
  // VexFlow fija el tamaño en píxeles; se quita para que el SVG se adapte a su caja (CSS).
  svg.removeAttribute('style');
  const noteEls = playable.map((note) => note.getSVGElement() as SVGElement);
  return {
    svg,
    notes: noteEls,
    mark(index, judgement) {
      const el = noteEls[index];
      if (!el) return;
      el.classList.remove('perfect', 'early', 'late', 'miss');
      el.classList.add(judgement);
    },
  };
}
