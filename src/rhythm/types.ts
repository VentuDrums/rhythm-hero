export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

/** Una figura o un silencio. */
export interface RhythmEvent {
  duration: Duration;
  dotted?: boolean;
  rest?: boolean;
}

/** Compases admitidos: 2/4, 3/4, 4/4 y 6/8. */
export interface TimeSignature {
  beats: number;
  beatUnit: 4 | 8;
}

export interface Exercise {
  timeSignature: TimeSignature;
  /** Pulsos por minuto: negra en x/4, negra con puntillo en 6/8. */
  bpm: number;
  measures: RhythmEvent[][];
}

/** Instante en que hay que tocar una figura (los silencios no generan ninguno). */
export interface NoteOnset {
  time: number;
  measure: number;
  /** Posición de la figura dentro de su compás. */
  index: number;
}
