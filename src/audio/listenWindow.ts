// Regla de turnos (SPEC.md): la app y el alumno nunca suenan a la vez.
// La app toca (claves, ejemplo) y no escucha; después calla y solo cuentan los golpes dentro de la ventana de escucha.
import { beatsPerMeasure } from '../rhythm/duration';
import type { TimeSignature } from '../rhythm/types';

/** Margen antes del primer pulso del alumno, para aceptar golpes adelantados (ventana "bien" = 100 ms). */
export const EARLY_S = 0.15;
/** Golpes que llegan justo después de un sonido de la app se ignoran por si el micro lo ha oído. */
export const MASK_AFTER_SOUND_S = 0.15;

export interface ListenWindow {
  open: number;
  close: number;
}

export interface TurnPlan {
  /** Instantes de las claves de la cuenta previa. */
  countIn: number[];
  /** Pulsos (silenciosos) del turno del alumno. */
  studentBeats: number[];
  listen: ListenWindow;
  end: number;
}

export function planTurn(options: {
  timeSignature: TimeSignature;
  bpm: number;
  startTime: number;
  studentMeasures: number;
}): TurnPlan {
  const { timeSignature, bpm, startTime, studentMeasures } = options;
  const beat = 60 / bpm;
  const perMeasure = beatsPerMeasure(timeSignature);
  const countIn = Array.from({ length: perMeasure }, (_, i) => startTime + i * beat);
  const studentStart = startTime + perMeasure * beat;
  const studentBeats = Array.from({ length: perMeasure * studentMeasures }, (_, i) => studentStart + i * beat);
  const end = studentStart + perMeasure * studentMeasures * beat;
  return { countIn, studentBeats, listen: { open: studentStart - EARLY_S, close: end }, end };
}

/** Filtra los golpes detectados: dentro de alguna ventana de escucha y lejos de los sonidos de la app. */
export function acceptOnsets(onsets: number[], windows: ListenWindow[], appSounds: number[]): number[] {
  return onsets.filter(
    (t) =>
      windows.some((w) => t >= w.open && t <= w.close) &&
      !appSounds.some((s) => t >= s && t - s < MASK_AFTER_SOUND_S),
  );
}

/**
 * ¿Debe la pantalla mostrar este golpe? Fuera de un turno se muestra todo (para probar el micro);
 * durante un turno, solo lo que cuenta, así las claves de la app no encienden el aviso.
 */
export function isShownOnset(time: number, plan: TurnPlan | null): boolean {
  if (!plan || time < (plan.countIn[0] as number) - EARLY_S || time > plan.end) return true;
  return acceptOnsets([time], [plan.listen], plan.countIn).length > 0;
}
