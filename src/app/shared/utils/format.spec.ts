import { describe, expect, it } from 'vitest';

import { formatClock, formatMbps } from './format';

describe('formatClock', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(492)).toBe('8:12');
  });

  it('formats hour-plus durations as h:mm:ss', () => {
    expect(formatClock(3847)).toBe('1:04:07');
  });

  it('degrades gracefully on non-finite or negative input', () => {
    expect(formatClock(Number.NaN)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('formatMbps', () => {
  it('converts bits per second to a one-decimal Mbps string', () => {
    expect(formatMbps(5_800_000)).toBe('5.8');
    expect(formatMbps(0)).toBe('0.0');
  });
});
