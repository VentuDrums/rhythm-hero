// Probador de micrófono: comprueba en un dispositivo real que se detectan las palmas,
// aplicando la regla de turnos (1 compás de claves y después silencio con pulso visual).
import { connectDetector, type DetectorConnection } from '../audio/detectorNode';
import { acceptOnsets, isShownOnset, planTurn, type TurnPlan } from '../audio/listenWindow';
import { MicAccessError, openMic } from '../audio/mic';
import { pulseOffsets } from '../audio/pulseStats';
import { playClave } from '../audio/synth';
import { applyTranslations, setText } from '../i18n';

const STUDENT_MEASURES = 4;
const LEAD_IN_S = 0.3;
const FLASH_MS = 120;

export function mountMicTester(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = `
    <a class="back" href="#/" data-i18n="nav.back"></a>
    <h1 data-i18n="mic.title" tabindex="-1"></h1>
    <p data-i18n="mic.intro"></p>
    <p class="note" data-i18n="mic.privacy"></p>
    <button type="button" class="button" id="enable" data-i18n="mic.enable"></button>
    <p id="error" class="error" role="alert"></p>
    <section id="controls" hidden>
      <label class="level"><span data-i18n="mic.level"></span>
        <meter id="level" min="0" max="1" value="0"></meter>
      </label>
      <label class="tempo"><span id="tempo-label"></span>
        <input id="tempo" type="range" min="60" max="140" step="5" value="90" />
      </label>
      <div class="pulse-row">
        <div id="pulse" class="pulse" aria-hidden="true"></div>
        <div id="flash" class="flash" aria-hidden="true"></div>
      </div>
      <button type="button" class="button" id="start" data-i18n="mic.start"></button>
      <p id="status" aria-live="polite"></p>
      <p id="detected" aria-live="polite"></p>
      <p id="offset"></p>
      <figure class="timeline-figure">
        <div id="timeline" class="timeline"></div>
        <figcaption data-i18n="mic.timeline"></figcaption>
      </figure>
    </section>`;
  applyTranslations(root);

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`) as T;
  const enable = $<HTMLButtonElement>('enable');
  const error = $('error');
  const controls = $('controls');
  const level = $<HTMLMeterElement>('level');
  const tempo = $<HTMLInputElement>('tempo');
  const tempoLabel = $('tempo-label');
  const pulse = $('pulse');
  const flash = $('flash');
  const start = $<HTMLButtonElement>('start');
  const status = $('status');
  const detected = $('detected');
  const offset = $('offset');
  const timeline = $('timeline');

  let ctx: AudioContext | null = null;
  let detector: DetectorConnection | null = null;
  let plan: TurnPlan | null = null;
  let claps: number[] = [];
  let raf = 0;
  let flashTimer = 0;

  const showTempo = () => setText(tempoLabel, 'mic.tempo', { bpm: tempo.value });
  showTempo();
  tempo.addEventListener('input', showTempo);

  function onOnset(time: number): void {
    if (!isShownOnset(time, plan)) return;
    flash.classList.add('on');
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => flash.classList.remove('on'), FLASH_MS);
    if (!plan) return;
    claps.push(...acceptOnsets([time], [plan.listen], plan.countIn));
    setText(detected, 'mic.detected', { count: claps.length });
    drawTimeline(timeline, plan, claps);
  }

  function onLevel(rms: number): void {
    // Escala en decibelios: -60 dB (silencio) a 0 dB (máximo).
    level.value = Math.min(1, Math.max(0, (20 * Math.log10(rms + 1e-9) + 60) / 60));
  }

  enable.addEventListener('click', async () => {
    error.textContent = '';
    // El AudioContext se crea dentro del clic: Safari en iPhone lo exige.
    ctx ??= new AudioContext();
    await ctx.resume();
    try {
      const stream = await openMic();
      detector = await connectDetector(ctx, stream, { onOnset, onLevel });
    } catch (e) {
      setText(error, `mic.error.${e instanceof MicAccessError ? e.reason : 'unavailable'}`);
      return;
    }
    enable.hidden = true;
    controls.hidden = false;
    setText(status, 'mic.status.ready');
  });

  start.addEventListener('click', () => {
    if (!ctx) return;
    const audio = ctx;
    const bpm = Number(tempo.value);
    plan = planTurn({ timeSignature: { beats: 4, beatUnit: 4 }, bpm, startTime: audio.currentTime + LEAD_IN_S, studentMeasures: STUDENT_MEASURES });
    for (const time of plan.countIn) playClave(audio, time);
    claps = [];
    start.disabled = true;
    tempo.disabled = true;
    offset.textContent = '';
    setText(detected, 'mic.detected', { count: 0 });
    setText(status, 'mic.status.listen');
    drawTimeline(timeline, plan, claps);
    const current = plan;
    const beat = 60 / bpm;
    const studentStart = current.studentBeats[0] as number;

    const tick = () => {
      const now = audio.currentTime;
      const sinceStart = now - (current.countIn[0] as number);
      const phase = sinceStart >= 0 ? sinceStart % beat : beat;
      pulse.classList.toggle('on', phase < 0.12);
      pulse.classList.toggle('student', now >= studentStart - 0.05);
      if (now >= studentStart && status.getAttribute('data-i18n') === 'mic.status.listen') setText(status, 'mic.status.play');
      if (now < current.end + 0.2) {
        raf = requestAnimationFrame(tick);
        return;
      }
      pulse.classList.remove('on', 'student');
      setText(status, 'mic.status.done');
      showOffset(offset, pulseOffsets(current.studentBeats, claps).meanOffsetMs);
      start.disabled = false;
      tempo.disabled = false;
    };
    raf = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(flashTimer);
    detector?.disconnect();
    void ctx?.close();
  };
}

function showOffset(el: HTMLElement, meanOffsetMs: number | null): void {
  if (meanOffsetMs === null) setText(el, 'mic.offset.none');
  else setText(el, meanOffsetMs < 0 ? 'mic.offset.early' : 'mic.offset.late', { ms: Math.abs(meanOffsetMs) });
}

/** Dibuja los pulsos del turno del alumno como rayas y los golpes aceptados como puntos. */
function drawTimeline(el: HTMLElement, plan: TurnPlan, claps: number[]): void {
  const from = plan.listen.open;
  const span = plan.listen.close - from;
  const pos = (t: number) => `${(((t - from) / span) * 100).toFixed(2)}%`;
  el.replaceChildren(
    ...plan.studentBeats.map((t) => marker('beat', pos(t))),
    ...claps.map((t) => marker('clap', pos(t))),
  );
}

function marker(kind: string, left: string): HTMLElement {
  const m = document.createElement('span');
  m.className = kind;
  m.style.left = left;
  return m;
}
