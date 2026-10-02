import { describe, expect, it } from 'vitest';

import { clampSeekTarget } from './seek.model';

describe('clampSeekTarget', () => {
  it('clamps within a VOD range starting at zero', () => {
    expect(clampSeekTarget(-5, { start: 0, end: 120 })).toBe(0);
    expect(clampSeekTarget(500, { start: 0, end: 120 })).toBe(120);
    expect(clampSeekTarget(60, { start: 0, end: 120 })).toBe(60);
  });

  it('clamps to a live DVR window that does not start at zero', () => {
    const range = { start: 300, end: 360 };
    expect(clampSeekTarget(0, range)).toBe(300);
    expect(clampSeekTarget(1000, range)).toBe(360);
    expect(clampSeekTarget(330, range)).toBe(330);
  });

  it('clamps +/-Infinity to the range edges', () => {
    expect(clampSeekTarget(Infinity, { start: 10, end: 50 })).toBe(50);
    expect(clampSeekTarget(-Infinity, { start: 10, end: 50 })).toBe(10);
  });

  it('falls back to the range start for NaN, which Math.min/max cannot clamp', () => {
    expect(clampSeekTarget(NaN, { start: 10, end: 50 })).toBe(10);
  });
});
