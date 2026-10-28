// Sonidos sintetizados con Web Audio (sin archivos que descargar).
// Claves: agudas y secas, para la cuenta previa. Woodblock: más grave y hueco, para los ejemplos.

function ping(ctx: BaseAudioContext, time: number, frequency: number, decayS: number, volume: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decayS);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + decayS);
}

export function playClave(ctx: BaseAudioContext, time: number): void {
  ping(ctx, time, 2500, 0.06, 0.6);
}

export function playWoodblock(ctx: BaseAudioContext, time: number): void {
  ping(ctx, time, 900, 0.12, 0.7);
}
