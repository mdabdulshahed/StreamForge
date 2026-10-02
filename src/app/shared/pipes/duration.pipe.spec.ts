import { describe, expect, it } from 'vitest';

import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('formats clock timecodes', () => {
    expect(pipe.transform(0, 'clock')).toBe('0:00');
    expect(pipe.transform(9, 'clock')).toBe('0:09');
    expect(pipe.transform(492, 'clock')).toBe('8:12');
    expect(pipe.transform(3847, 'clock')).toBe('1:04:07');
  });

  it('formats human-readable runtimes', () => {
    expect(pipe.transform(45)).toBe('45s');
    expect(pipe.transform(634)).toBe('10m');
    expect(pipe.transform(3847)).toBe('1h 4m');
    expect(pipe.transform(7200)).toBe('2h');
  });

  it('treats a null duration as live, which is how the catalog models it', () => {
    expect(pipe.transform(null)).toBe('LIVE');
    expect(pipe.transform(undefined)).toBe('LIVE');
  });

  it('degrades gracefully on non-finite input from the media element', () => {
    // HTMLMediaElement.duration is NaN before metadata loads and Infinity for
    // some live streams — neither should reach the UI as "NaN:aN".
    expect(pipe.transform(Number.NaN, 'clock')).toBe('0:00');
    expect(pipe.transform(Number.POSITIVE_INFINITY, 'clock')).toBe('0:00');
    expect(pipe.transform(-5)).toBe('—');
  });
});
