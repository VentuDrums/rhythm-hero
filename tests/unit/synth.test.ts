import { describe, expect, it } from 'vitest';
import { playClave, playWoodblock } from '../../src/audio/synth';

// Contexto de audio falso que registra lo que se programa (jsdom no tiene Web Audio).
function fakeContext() {
  const log: string[] = [];
  const param = (name: string) => ({
    value: 0,
    setValueAtTime: (v: number, t: number) => log.push(`${name}=${v}@${t}`),
    exponentialRampToValueAtTime: (v: number, t: number) => log.push(`${name}->${v}@${t}`),
  });
  const node = (kind: string) => ({
    connect: () => node(kind),
    start: (t: number) => log.push(`${kind}.start@${t}`),
    stop: (t: number) => log.push(`${kind}.stop@${t}`),
  });
  const ctx = {
    destination: {},
    createOscillator: () => ({ ...node('osc'), type: 'sine', frequency: param('freq') }),
    createGain: () => ({ ...node('gain'), gain: param('gain') }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, log };
}

describe('synth', () => {
  it('schedules a short, high clave at the requested time', () => {
    const { ctx, log } = fakeContext();
    playClave(ctx, 2);
    expect(log).toContain('osc.start@2');
    expect(log.some((l) => /^freq=2\d{3}@2$/.test(l))).toBe(true);
    const stop = Number(log.find((l) => l.startsWith('osc.stop@'))?.split('@')[1]);
    expect(stop - 2).toBeLessThanOrEqual(0.1);
  });

  it('schedules a woodblock lower than the clave, so they are easy to tell apart', () => {
    const { ctx, log } = fakeContext();
    playWoodblock(ctx, 1);
    expect(log).toContain('osc.start@1');
    const freq = Number(log.find((l) => l.startsWith('freq='))?.slice(5).split('@')[0]);
    expect(freq).toBeGreaterThan(400);
    expect(freq).toBeLessThan(1500);
  });
});
