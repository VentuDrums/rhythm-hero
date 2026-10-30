import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'rhythm-hero.progress';
const ids = [1, 2, 3];

// Cada test carga el módulo de nuevo para empezar sin nada en memoria.
async function load() {
  vi.resetModules();
  return import('../../src/storage/progress');
}

describe('progress storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts empty, with only the first level unlocked', async () => {
    const { isUnlocked, loadProgress } = await load();
    const progress = loadProgress();
    expect(progress).toEqual({});
    expect(ids.map((id) => isUnlocked(ids, id, progress))).toEqual([true, false, false]);
  });

  it('saves the result so it survives closing the browser', async () => {
    const first = await load();
    first.recordResult(1, { percent: 88, stars: 2, passed: true });
    const reopened = await load();
    expect(reopened.loadProgress()).toEqual({ 1: { best: 88, stars: 2, passed: true } });
  });

  it('passing a level unlocks the next one; failing does not', async () => {
    const { isUnlocked, loadProgress, recordResult } = await load();
    recordResult(1, { percent: 50, stars: 0, passed: false });
    expect(isUnlocked(ids, 2, loadProgress())).toBe(false);
    recordResult(1, { percent: 75, stars: 1, passed: true });
    expect(isUnlocked(ids, 2, loadProgress())).toBe(true);
    expect(isUnlocked(ids, 3, loadProgress())).toBe(false);
  });

  it('keeps the best result when a later attempt is worse', async () => {
    const { loadProgress, recordResult } = await load();
    recordResult(1, { percent: 96, stars: 3, passed: true });
    expect(recordResult(1, { percent: 40, stars: 0, passed: false })).toEqual({ best: 96, stars: 3, passed: true });
    expect(loadProgress()[1]).toEqual({ best: 96, stars: 3, passed: true });
  });

  it('treats unknown levels as locked', async () => {
    const { isUnlocked } = await load();
    expect(isUnlocked(ids, 99, {})).toBe(false);
  });

  it.each([
    ['not JSON', '{oops'],
    ['not an object', '42'],
    ['null', 'null'],
  ])('starts again if the saved data is corrupted (%s)', async (_name, raw) => {
    localStorage.setItem(KEY, raw);
    const { loadProgress, recordResult } = await load();
    expect(loadProgress()).toEqual({});
    expect(recordResult(1, { percent: 80, stars: 1, passed: true }).passed).toBe(true);
  });

  it('drops only the records that make no sense', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ 1: { best: 90, stars: 2, passed: true }, 2: { best: 900, stars: 2, passed: true }, 3: { best: 50, stars: 7, passed: false }, x: { best: 1, stars: 0, passed: false }, 4: 'hola' }),
    );
    const { loadProgress } = await load();
    expect(loadProgress()).toEqual({ 1: { best: 90, stars: 2, passed: true } });
  });

  it('keeps working for this session when the browser blocks storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { isUnlocked, loadProgress, recordResult } = await load();
    expect(loadProgress()).toEqual({});
    recordResult(1, { percent: 80, stars: 1, passed: true });
    expect(isUnlocked(ids, 2, loadProgress())).toBe(true);
  });
});
