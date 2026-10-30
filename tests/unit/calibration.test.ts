import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clapOffsets, computeLatency, median } from '../../src/audio/calibration';

// 8 pulsos a 80 BPM (0,75 s) empezando en el segundo 10.
const beats = Array.from({ length: 8 }, (_, i) => 10 + i * 0.75);
const clapsWith = (delays: number[]) => beats.map((b, i) => b + (delays[i] as number));

describe('computeLatency', () => {
  it('measures a steady delay', () => {
    const result = computeLatency(beats, clapsWith([0.08, 0.09, 0.07, 0.08, 0.085, 0.075, 0.08, 0.09]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.latencyS).toBeCloseTo(0.08, 3);
      expect(result.used).toBe(8);
    }
  });

  it('uses the median and ignores one or two wild claps', () => {
    const result = computeLatency(beats, clapsWith([0.08, 0.08, 0.3, 0.08, 0.07, -0.25, 0.09, 0.08]));
    expect(result).toMatchObject({ ok: true, used: 6 });
    if (result.ok) expect(result.latencyS).toBeCloseTo(0.08, 3);
  });

  it('works for players who clap slightly ahead of the beat', () => {
    const result = computeLatency(beats, clapsWith(Array(8).fill(-0.02)));
    expect(result.ok && result.latencyS).toBeCloseTo(-0.02, 6);
  });

  it('asks to repeat when there are too few claps', () => {
    expect(computeLatency(beats, beats.slice(0, 5).map((b) => b + 0.08))).toEqual({ ok: false, reason: 'few' });
    expect(computeLatency(beats, [])).toEqual({ ok: false, reason: 'few' });
  });

  it('asks to repeat when the claps are too irregular', () => {
    expect(computeLatency(beats, clapsWith([0, 0.05, 0.1, 0.15, -0.05, 0.12, 0.02, 0.08]))).toEqual({ ok: false, reason: 'spread' });
    // Una oscilación normal de ±20 ms sí vale.
    expect(computeLatency(beats, clapsWith([0.06, 0.1, 0.06, 0.1, 0.06, 0.1, 0.06, 0.1]))).toMatchObject({ ok: true });
  });

  it('rejects too many outliers even if the rest agree', () => {
    expect(computeLatency(beats, clapsWith([0.08, 0.08, 0.08, 0.08, 0.08, 0.3, 0.3, 0.3]))).toEqual({ ok: false, reason: 'spread' });
  });

  it('rejects a delay that cannot be real', () => {
    const late = Array.from({ length: 8 }, (_, i) => 10 + i * 1.5);
    expect(computeLatency(late, late.map((b) => b + 0.5))).toEqual({ ok: false, reason: 'range' });
  });
});

describe('clapOffsets', () => {
  it('pairs each beat with its nearest clap within half a beat', () => {
    expect(clapOffsets([1, 2, 3], [1.1, 2.6, 2.95]).map((d) => Math.round(d * 100) / 100)).toEqual([0.1, -0.05]);
  });

  it('needs at least two beats to know the tempo', () => {
    expect(clapOffsets([1], [1])).toEqual([]);
  });
});

describe('median', () => {
  it('handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('settings: latency', () => {
  beforeEach(() => {
    // Cada test empieza con el módulo recién cargado (sin valor en memoria).
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is unknown until the device has been calibrated, then remembers it', async () => {
    const { getLatency, setLatency } = await import('../../src/storage/settings');
    expect(getLatency()).toBeNull();
    expect(setLatency(0.085)).toBe(true);
    expect(getLatency()).toBe(0.085);
  });

  it('ignores a corrupted value', async () => {
    const { getLatency } = await import('../../src/storage/settings');
    localStorage.setItem('rhythm-hero.latency', 'abc');
    expect(getLatency()).toBeNull();
  });

  it('keeps the value for this page when the browser blocks storage', async () => {
    const { getLatency, setLatency } = await import('../../src/storage/settings');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getLatency()).toBeNull();
    expect(setLatency(0.1)).toBe(false);
    expect(getLatency()).toBe(0.1);
  });
});

describe('settings: unlock all levels', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is off until the teacher turns it on, and is remembered', async () => {
    const first = await import('../../src/storage/settings');
    expect(first.getUnlockAll()).toBe(false);
    first.setUnlockAll(true);
    vi.resetModules();
    const reopened = await import('../../src/storage/settings');
    expect(reopened.getUnlockAll()).toBe(true);
    reopened.setUnlockAll(false);
    expect(reopened.getUnlockAll()).toBe(false);
  });

  it('lasts for this page when the browser blocks storage', async () => {
    const { getUnlockAll, setUnlockAll } = await import('../../src/storage/settings');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setUnlockAll(true);
    expect(getUnlockAll()).toBe(true);
  });
});
