// Pantalla de calibración (T8): 1 compás de claves y 8 palmas en silencio con el pulso visual.
import { CALIBRATION_CLAPS, computeLatency } from '../audio/calibration';
import { connectDetector, type DetectorConnection } from '../audio/detectorNode';
import { acceptOnsets, planTurn, type TurnPlan } from '../audio/listenWindow';
import { MicAccessError, openMic } from '../audio/mic';
import { playClave } from '../audio/synth';
import { applyTranslations, setText } from '../i18n';
import { getLatency, setLatency } from '../storage/settings';

const BPM = 80;
const LEAD_IN_S = 0.4;

export function mountCalibration(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = `
    <a class="back" href="#/" data-i18n="nav.back"></a>
    <h1 data-i18n="cal.title" tabindex="-1"></h1>
    <p data-i18n="cal.intro"></p>
    <p id="current" class="note"></p>
    <p id="error" class="error" role="alert"></p>
    <div class="stage"><div id="pulse" class="pulse" aria-hidden="true"></div></div>
    <p id="status" aria-live="polite"></p>
    <div class="actions">
      <button type="button" class="button" id="start" data-i18n="cal.start"></button>
      <a class="button secondary" href="#/leer" data-i18n="cal.toPlay"></a>
    </div>`;
  applyTranslations(root);

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`) as T;
  const current = $('current');
  const error = $('error');
  const pulse = $('pulse');
  const status = $('status');
  const start = $<HTMLButtonElement>('start');

  const showCurrent = (): void => {
    const latency = getLatency();
    if (latency === null) setText(current, 'cal.none');
    else setText(current, 'cal.current', { ms: Math.round(latency * 1000) });
  };
  showCurrent();

  let ctx: AudioContext | null = null;
  let detector: DetectorConnection | null = null;
  let plan: TurnPlan | null = null;
  let claps: number[] = [];
  let raf = 0;

  function onOnset(time: number): void {
    if (plan) claps.push(...acceptOnsets([time], [plan.listen], plan.countIn));
  }

  async function begin(): Promise<void> {
    error.textContent = '';
    start.disabled = true;
    // El AudioContext se crea dentro del clic: Safari en iPhone lo exige.
    ctx ??= new AudioContext();
    await ctx.resume();
    if (!detector) {
      try {
        detector = await connectDetector(ctx, await openMic(), { onOnset, onLevel: () => {} });
      } catch (e) {
        setText(error, `mic.error.${e instanceof MicAccessError ? e.reason : 'unavailable'}`);
        start.disabled = false;
        return;
      }
    }
    const audio = ctx;
    const turn = planTurn({
      timeSignature: { beats: 4, beatUnit: 4 },
      bpm: BPM,
      startTime: audio.currentTime + LEAD_IN_S,
      studentMeasures: CALIBRATION_CLAPS / 4,
    });
    plan = turn;
    claps = [];
    for (const time of turn.countIn) playClave(audio, time);
    setText(status, 'cal.status.listen');
    const beat = 60 / BPM;
    const studentStart = turn.studentBeats[0] as number;

    const frame = (): void => {
      const now = audio.currentTime;
      const since = now - (turn.countIn[0] as number);
      pulse.classList.toggle('on', since >= 0 && now < turn.end && since % beat < 0.12);
      pulse.classList.toggle('student', now >= studentStart - 0.05);
      if (now >= studentStart && status.getAttribute('data-i18n') === 'cal.status.listen') setText(status, 'cal.status.play');
      // Medio pulso de margen para la última palma, aunque llegue tarde.
      if (now < turn.end + beat / 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      pulse.classList.remove('on', 'student');
      start.disabled = false;
      const result = computeLatency(turn.studentBeats, claps);
      if (!result.ok) {
        status.textContent = '';
        setText(error, `cal.error.${result.reason}`);
        return;
      }
      const ms = Math.round(result.latencyS * 1000);
      setText(status, setLatency(result.latencyS) ? 'cal.ok' : 'cal.notSaved', { ms });
      showCurrent();
    };
    raf = requestAnimationFrame(frame);
  }

  start.addEventListener('click', () => void begin());

  return () => {
    cancelAnimationFrame(raf);
    detector?.disconnect();
    void ctx?.close();
  };
}
