import { describe, expect, it } from 'vitest';
import { detectOnsets, OnsetDetector } from '../../src/audio/onsets';
import { evaluate, renderScene, steadyHits } from '../helpers/synthAudio';

const SR = 48000;

// Criterio de SPEC.md: ≥ 95 % detectados con error ≤ 20 ms y ≤ 5 % de falsos positivos.
function expectSpecAccuracy(expected: number[], detected: number[]) {
  const r = evaluate(expected, detected, 0.02);
  expect(r.recall).toBeGreaterThanOrEqual(0.95);
  expect(r.falsePositiveRate).toBeLessThanOrEqual(0.05);
  expect(r.maxError).toBeLessThanOrEqual(0.02);
}

describe('detectOnsets', () => {
  it('finds claps of varying loudness in a quiet room', () => {
    const hits = steadyHits({ bpm: 100, count: 40, start: 0.5, kind: 'clap', minAmplitude: 0.15 });
    const audio = renderScene({ sampleRate: SR, duration: 26, hits, noise: 0.005 });
    expectSpecAccuracy(
      hits.map((h) => h.time),
      detectOnsets(audio, SR),
    );
  });

  it('finds table taps', () => {
    const hits = steadyHits({ bpm: 90, count: 30, start: 0.5, kind: 'table', minAmplitude: 0.2, seed: 3 });
    const audio = renderScene({ sampleRate: SR, duration: 22, hits, noise: 0.005, seed: 3 });
    expectSpecAccuracy(
      hits.map((h) => h.time),
      detectOnsets(audio, SR),
    );
  });

  it('copes with moderate classroom background noise', () => {
    const hits = steadyHits({ bpm: 120, count: 40, start: 1, kind: 'clap', minAmplitude: 0.3, seed: 11 });
    const audio = renderScene({ sampleRate: SR, duration: 22, hits, noise: 0.03, seed: 11 });
    expectSpecAccuracy(
      hits.map((h) => h.time),
      detectOnsets(audio, SR),
    );
  });

  it('keeps up with fast sixteenths (160 BPM, ~94 ms apart)', () => {
    const hits = steadyHits({ bpm: 160 * 4, count: 32, start: 0.5, kind: 'clap', jitter: 0.004, minAmplitude: 0.4, seed: 5 });
    const audio = renderScene({ sampleRate: SR, duration: 4, hits, noise: 0.005, seed: 5 });
    expectSpecAccuracy(
      hits.map((h) => h.time),
      detectOnsets(audio, SR),
    );
  });

  it('does not count a room echo as a second clap', () => {
    const hits = steadyHits({ bpm: 80, count: 20, start: 0.5, kind: 'clap', minAmplitude: 0.5, seed: 9 });
    const audio = renderScene({ sampleRate: SR, duration: 16, hits, noise: 0.005, echo: { delay: 0.04, gain: 0.6 }, seed: 9 });
    expectSpecAccuracy(
      hits.map((h) => h.time),
      detectOnsets(audio, SR),
    );
  });

  it('detects nothing in silence or steady noise', () => {
    expect(detectOnsets(new Float32Array(SR * 3), SR)).toEqual([]);
    expect(detectOnsets(renderScene({ sampleRate: SR, duration: 5, hits: [], noise: 0.05 }), SR)).toEqual([]);
  });

  it('gives the same result fed in small blocks as all at once (as in the AudioWorklet)', () => {
    const hits = steadyHits({ bpm: 100, count: 12, start: 0.3, kind: 'clap' });
    const audio = renderScene({ sampleRate: SR, duration: 8, hits, noise: 0.005 });
    const detector = new OnsetDetector(SR);
    const streamed: number[] = [];
    for (let i = 0; i < audio.length; i += 128) streamed.push(...detector.process(audio.subarray(i, i + 128), i / SR));
    expect(streamed).toEqual(detectOnsets(audio, SR));
  });

  it('does not fire late on the ringing tail of a sound once the refractory period ends', () => {
    const audio = renderScene({
      sampleRate: SR,
      duration: 1,
      hits: [{ time: 0.2, amplitude: 1, kind: 'table' }],
    });
    expect(detectOnsets(audio, SR, { refractoryS: 0.03 })).toHaveLength(1);
  });

  it('applies a longer refractory period when asked (classroom mode)', () => {
    // Dos palmadas separadas 100 ms: el modo normal (80 ms) las cuenta, el de clase (120 ms) no.
    const audio = renderScene({
      sampleRate: SR,
      duration: 1,
      hits: [
        { time: 0.2, amplitude: 0.8, kind: 'clap' },
        { time: 0.3, amplitude: 0.8, kind: 'clap' },
      ],
    });
    expect(detectOnsets(audio, SR)).toHaveLength(2);
    expect(detectOnsets(audio, SR, { refractoryS: 0.12 })).toHaveLength(1);
  });
});
