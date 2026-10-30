// Pantalla del modo "Leer y tocar" (T7): partitura que avanza hacia la línea, pulso visual, feedback y resumen.
import { connectDetector, type DetectorConnection } from '../audio/detectorNode';
import { MicAccessError, openMic } from '../audio/mic';
import { playClave } from '../audio/synth';
import { applyTranslations, setText } from '../i18n';
import { ReadAndPlayRun } from '../modes/readAndPlay';
import type { RenderedExercise } from '../notation/render';
import { xAtTicks } from '../notation/scroll';
import { getLevel, LEVELS, nextLevel } from '../levels';
import { beatTicks, measureTicks } from '../rhythm/duration';
import { isUnlocked, loadProgress, recordResult } from '../storage/progress';
import { getLatency } from '../storage/settings';
import { DEFAULT_SCORE_OPTIONS, type Judgement, type RunScore } from '../scoring/score';

const LEAD_IN_S = 0.4;
const MEASURE_PX = 260;
/** La línea de golpeo, a esta fracción del ancho del carril. */
const HIT_LINE = 0.25;

export function mountReadAndPlay(root: HTMLElement, param?: string): () => void {
  const level = getLevel(Number(param ?? '1'));
  root.className = 'screen';
  if (!level || !isUnlocked(LEVELS.map((l) => l.id), level.id, loadProgress())) {
    root.innerHTML = `
      <a class="back" href="#/niveles" data-i18n="nav.back"></a>
      <h1 data-i18n="play.title" tabindex="-1"></h1>
      <p data-i18n="${level ? 'play.locked' : 'play.notFound'}"></p>
      <a class="button" href="#/niveles" data-i18n="levels.choose"></a>`;
    applyTranslations(root);
    return () => {};
  }
  const { id: levelId, exercise } = level;
  const next = nextLevel(level.id);
  const { beats, beatUnit } = exercise.timeSignature;
  root.innerHTML = `
    <a class="back" href="#/niveles" data-i18n="nav.back"></a>
    <h1 data-i18n="play.title" tabindex="-1"></h1>
    <p data-i18n="play.intro"></p>
    <p class="note level-line"><span data-i18n="levels.number" data-i18n-params='{"n":${level.id}}'></span>
      <span data-i18n="level.title.${level.id}"></span> · ${beats}/${beatUnit} · ${exercise.bpm} BPM</p>
    <p id="uncalibrated" class="note" hidden>
      <span data-i18n="play.uncalibrated"></span> <a href="#/calibrar" data-i18n="play.calibrate"></a>
    </p>
    <p id="error" class="error" role="alert"></p>
    <section id="game">
      <div class="stage">
        <div id="pulse" class="pulse" aria-hidden="true"></div>
        <p id="judge" class="judge" aria-hidden="true"></p>
      </div>
      <div class="lane" aria-hidden="true">
        <div id="track" class="paper track"></div>
        <div class="hit-line"></div>
      </div>
      <p id="status" aria-live="polite"></p>
      <div class="actions">
        <button type="button" class="button" id="start" data-i18n="play.start"></button>
        <button type="button" class="button secondary" id="stop" data-i18n="play.stop" hidden></button>
      </div>
    </section>
    <section id="summary" class="summary" hidden>
      <h2 data-i18n="summary.title" tabindex="-1"></h2>
      <p id="sum-percent" class="big"></p>
      <p id="sum-stars" class="stars"></p>
      <p id="sum-pass"></p>
      <ul>
        <li id="sum-perfect"></li><li id="sum-good"></li><li id="sum-miss"></li><li id="sum-extra"></li>
      </ul>
      <figure class="score-figure">
        <figcaption data-i18n="summary.score"></figcaption>
        <div id="sum-score" class="paper" aria-hidden="true"></div>
      </figure>
      <div class="actions">
        ${next ? `<a class="button" id="next" href="#/leer/${next.id}" data-i18n="summary.next" hidden></a>` : ''}
        <button type="button" class="button" id="again" data-i18n="summary.again"></button>
        <a class="button secondary" href="#/niveles" data-i18n="levels.choose"></a>
      </div>
    </section>`;
  applyTranslations(root);

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`) as T;
  const error = $('error');
  const game = $('game');
  const pulse = $('pulse');
  const judgeEl = $('judge');
  const track = $<HTMLDivElement>('track');
  const lane = track.parentElement as HTMLElement;
  const status = $('status');
  const start = $<HTMLButtonElement>('start');
  const stop = $<HTMLButtonElement>('stop');
  const summary = $('summary');
  $('uncalibrated').hidden = getLatency() !== null;

  let ctx: AudioContext | null = null;
  let detector: DetectorConnection | null = null;
  let run: ReadAndPlayRun | null = null;
  let drawn: RenderedExercise | null = null;
  let raf = 0;
  let judgeTimer = 0;
  let alive = true;
  const notation = import('../notation/render').then(async (module) => {
    await module.loadNotationFont();
    return module;
  });

  const drawTrack = async (): Promise<void> => {
    const { renderExercise } = await notation;
    if (!alive) return;
    drawn = renderExercise(track, exercise, { width: 42 + exercise.measures.length * MEASURE_PX, measuresPerRow: exercise.measures.length });
    placeTrack(-beatTicks(exercise.timeSignature) * 2);
  };
  void drawTrack();

  const pxPerTick = MEASURE_PX / measureTicks(exercise.timeSignature);
  function placeTrack(ticks: number): void {
    if (!drawn) return;
    const offset = lane.clientWidth * HIT_LINE - xAtTicks(drawn.anchors, ticks, pxPerTick);
    track.style.transform = `translateX(${offset.toFixed(1)}px)`;
  }

  function showJudgement(judgement: Judgement): void {
    setText(judgeEl, `play.judge.${judgement}`);
    judgeEl.className = `judge ${judgement}`;
    window.clearTimeout(judgeTimer);
    judgeTimer = window.setTimeout(() => (judgeEl.textContent = ''), 600);
  }

  function onOnset(time: number): void {
    const mark = run?.hit(time);
    if (!mark) return;
    drawn?.mark(mark.index, mark.judgement);
    showJudgement(mark.judgement);
  }

  async function ensureMic(): Promise<boolean> {
    // El AudioContext se crea dentro del clic: Safari en iPhone lo exige.
    ctx ??= new AudioContext();
    await ctx.resume();
    if (detector) return true;
    try {
      const stream = await openMic();
      detector = await connectDetector(ctx, stream, { onOnset, onLevel: () => {} });
      return true;
    } catch (e) {
      setText(error, `mic.error.${e instanceof MicAccessError ? e.reason : 'unavailable'}`);
      return false;
    }
  }

  function endRun(): void {
    cancelAnimationFrame(raf);
    pulse.classList.remove('on', 'student');
    start.hidden = false;
    start.disabled = false;
    stop.hidden = true;
  }

  async function begin(): Promise<void> {
    error.textContent = '';
    start.disabled = true;
    setText(status, 'play.status.loading');
    if (!(await ensureMic())) {
      start.disabled = false;
      status.textContent = '';
      return;
    }
    await drawTrack();
    const audio = ctx as AudioContext;
    summary.hidden = true;
    game.hidden = false;
    start.hidden = true;
    stop.hidden = false;
    const current = new ReadAndPlayRun(exercise, { startTime: audio.currentTime + LEAD_IN_S, latencyS: getLatency() ?? 0 });
    run = current;
    for (const time of current.plan.countIn) playClave(audio, time);
    setText(status, 'play.status.listen');
    const beat = current.plan.countIn.length > 1 ? (current.plan.countIn[1] as number) - (current.plan.countIn[0] as number) : 1;

    const frame = (): void => {
      const now = audio.currentTime;
      placeTrack(current.ticksAt(now));
      const sinceStart = now - (current.plan.countIn[0] as number);
      pulse.classList.toggle('on', sinceStart >= 0 && now < current.plan.end && sinceStart % beat < 0.12);
      pulse.classList.toggle('student', now >= current.studentStart - 0.05);
      if (now >= current.studentStart && status.getAttribute('data-i18n') === 'play.status.listen') setText(status, 'play.status.play');
      for (const miss of current.missesUntil(now)) {
        drawn?.mark(miss.index, 'miss');
        showJudgement('miss');
      }
      if (now < current.end) {
        raf = requestAnimationFrame(frame);
        return;
      }
      endRun();
      void showSummary(current.finish());
    };
    raf = requestAnimationFrame(frame);
  }

  async function showSummary(score: RunScore): Promise<void> {
    recordResult(levelId, score);
    const nextLink = root.querySelector<HTMLElement>('#next');
    if (nextLink) nextLink.hidden = !score.passed;
    status.textContent = '';
    game.hidden = true;
    summary.hidden = false;
    setText($('sum-percent'), 'summary.percent', { percent: score.percent });
    const stars = $('sum-stars');
    stars.textContent = '★'.repeat(score.stars) + '☆'.repeat(3 - score.stars);
    stars.setAttribute('role', 'img');
    stars.setAttribute('data-i18n-label', 'summary.stars');
    stars.setAttribute('data-i18n-params', JSON.stringify({ stars: score.stars }));
    if (score.passed) setText($('sum-pass'), 'summary.passed');
    else setText($('sum-pass'), 'summary.failed', { pass: DEFAULT_SCORE_OPTIONS.passPercent });
    setText($('sum-perfect'), 'summary.perfect', { count: score.perfect });
    setText($('sum-good'), 'summary.good', { count: score.good });
    setText($('sum-miss'), 'summary.miss', { count: score.miss });
    setText($('sum-extra'), 'summary.extra', { count: score.extra });
    applyTranslations(summary);
    root.querySelector<HTMLElement>('#summary h2')?.focus();
    const { renderExercise } = await notation;
    const paper = $<HTMLDivElement>('sum-score');
    const full = renderExercise(paper, exercise, { width: paper.clientWidth });
    score.notes.forEach((note, i) => full.mark(i, note.judgement));
  }

  start.addEventListener('click', () => void begin());
  $('again').addEventListener('click', () => void begin());
  stop.addEventListener('click', () => {
    run = null;
    endRun();
    setText(status, 'play.status.stopped');
    void drawTrack();
  });

  return () => {
    alive = false;
    run = null;
    cancelAnimationFrame(raf);
    window.clearTimeout(judgeTimer);
    detector?.disconnect();
    void ctx?.close();
  };
}
