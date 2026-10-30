// Notación de texto corta para escribir ritmos a mano (niveles, y más adelante el editor):
//   w = redonda, h = blanca, q = negra, 8 = corchea, 16 = semicorchea
//   "." detrás = con puntillo, "r" detrás = silencio, "|" separa compases.
// Ejemplo: "q q 8 8 q | h. qr"
import type { Duration, RhythmEvent, TimeSignature } from './types';

const DURATIONS: Record<string, Duration> = { w: 'whole', h: 'half', q: 'quarter', '8': 'eighth', '16': 'sixteenth' };
const TOKEN = /^(w|h|q|8|16)(\.?)(r?)$/;

export class RhythmSyntaxError extends Error {
  constructor(readonly token: string) {
    super(`Figura desconocida: "${token}"`);
    this.name = 'RhythmSyntaxError';
  }
}

export function parseEvent(token: string): RhythmEvent {
  const match = TOKEN.exec(token);
  if (!match) throw new RhythmSyntaxError(token);
  const event: RhythmEvent = { duration: DURATIONS[match[1] as string] as Duration };
  if (match[2]) event.dotted = true;
  if (match[3]) event.rest = true;
  return event;
}

export function parseMeasures(text: string): RhythmEvent[][] {
  return text
    .split('|')
    .map((measure) => measure.trim())
    .filter((measure) => measure.length > 0)
    .map((measure) => measure.split(/\s+/).map(parseEvent));
}

/** "4/4" → { beats: 4, beatUnit: 4 }. Solo los compases que admite el juego. */
export function parseTimeSignature(text: string): TimeSignature {
  switch (text) {
    case '2/4':
      return { beats: 2, beatUnit: 4 };
    case '3/4':
      return { beats: 3, beatUnit: 4 };
    case '4/4':
      return { beats: 4, beatUnit: 4 };
    case '6/8':
      return { beats: 6, beatUnit: 8 };
    default:
      throw new RhythmSyntaxError(text);
  }
}
