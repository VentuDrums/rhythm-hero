import { describe, expect, it } from 'vitest';
import { pulseOffsets } from '../../src/audio/pulseStats';

const beats = [0, 0.5, 1, 1.5];

describe('pulseOffsets', () => {
  it('averages how early (negative) or late (positive) the claps are', () => {
    expect(pulseOffsets(beats, [0.02, 0.53, 1.04, 1.47])).toEqual({ matched: 4, meanOffsetMs: 15 });
    expect(pulseOffsets(beats, [-0.03, 0.47])).toEqual({ matched: 2, meanOffsetMs: -30 });
  });

  it('ignores claps that are nowhere near a beat', () => {
    expect(pulseOffsets(beats, [0.01, 3])).toEqual({ matched: 1, meanOffsetMs: 10 });
  });

  it('reports nothing when there are no claps or not enough beats', () => {
    expect(pulseOffsets(beats, [])).toEqual({ matched: 0, meanOffsetMs: null });
    expect(pulseOffsets([1], [1])).toEqual({ matched: 0, meanOffsetMs: null });
  });
});
