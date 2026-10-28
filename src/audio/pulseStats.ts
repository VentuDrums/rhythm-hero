/** Compara los golpes con los pulsos: cuántos caen cerca de un pulso y cuánto se adelantan o atrasan de media. */
export function pulseOffsets(beats: number[], claps: number[]): { matched: number; meanOffsetMs: number | null } {
  if (beats.length < 2) return { matched: 0, meanOffsetMs: null };
  const halfBeat = ((beats[1] as number) - (beats[0] as number)) / 2;
  const offsets: number[] = [];
  for (const clap of claps) {
    const nearest = beats.reduce((best, b) => (Math.abs(b - clap) < Math.abs(best - clap) ? b : best));
    if (Math.abs(nearest - clap) < halfBeat) offsets.push(clap - nearest);
  }
  if (offsets.length === 0) return { matched: 0, meanOffsetMs: null };
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  return { matched: offsets.length, meanOffsetMs: Math.round(mean * 1000) };
}
