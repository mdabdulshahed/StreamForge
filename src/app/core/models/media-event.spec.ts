import { describe, expect, it } from 'vitest';

import { bufferAheadSeconds, derivePlaybackState } from './media-event.model';

const snap = (paused: boolean, ended = false) => ({ paused, ended });

describe('derivePlaybackState', () => {
  it('reports error regardless of prior state', () => {
    expect(derivePlaybackState('playing', 'error', snap(false))).toBe('error');
    expect(derivePlaybackState('ended', 'error', snap(true, true))).toBe('error');
  });

  it('reports ended once the element reports ended, even mid-stream events', () => {
    expect(derivePlaybackState('playing', 'timeupdate', snap(true, true))).toBe('ended');
  });

  it('reports seeking even while the element is paused', () => {
    expect(derivePlaybackState('paused', 'seeking', snap(true))).toBe('seeking');
  });

  it('treats waiting/stalled as buffering only while actually playing', () => {
    expect(derivePlaybackState('playing', 'waiting', snap(false))).toBe('buffering');
    expect(derivePlaybackState('playing', 'stalled', snap(false))).toBe('buffering');
    expect(derivePlaybackState('paused', 'waiting', snap(true))).toBe('paused');
  });

  it('reports paused whenever the element is paused, regardless of which event fired', () => {
    expect(derivePlaybackState('playing', 'timeupdate', snap(true))).toBe('paused');
    expect(derivePlaybackState('buffering', 'progress', snap(true))).toBe('paused');
  });

  it('resumes playing on playing/seeked/canplay once unpaused', () => {
    expect(derivePlaybackState('buffering', 'playing', snap(false))).toBe('playing');
    expect(derivePlaybackState('seeking', 'seeked', snap(false))).toBe('playing');
    expect(derivePlaybackState('idle', 'canplay', snap(false))).toBe('playing');
  });

  it('leaves the state alone for purely informational events mid-playback', () => {
    expect(derivePlaybackState('playing', 'volumechange', snap(false))).toBe('playing');
    expect(derivePlaybackState('playing', 'ratechange', snap(false))).toBe('playing');
    expect(derivePlaybackState('playing', 'progress', snap(false))).toBe('playing');
  });

  it('resolves the initial idle state to paused once metadata is ready', () => {
    expect(derivePlaybackState('idle', 'loadedmetadata', snap(true))).toBe('paused');
  });
});

describe('bufferAheadSeconds', () => {
  it('returns the remaining buffer in the range containing currentTime', () => {
    const ranges = [{ start: 0, end: 20 }];
    expect(bufferAheadSeconds(ranges, 12)).toBe(8);
  });

  it('picks the range that actually contains currentTime among several', () => {
    const ranges = [
      { start: 0, end: 10 },
      { start: 15, end: 40 },
    ];
    expect(bufferAheadSeconds(ranges, 20)).toBe(20);
  });

  it('returns 0 when currentTime falls in a gap between ranges', () => {
    const ranges = [
      { start: 0, end: 10 },
      { start: 15, end: 40 },
    ];
    expect(bufferAheadSeconds(ranges, 12)).toBe(0);
  });

  it('returns 0 for an empty buffered list', () => {
    expect(bufferAheadSeconds([], 5)).toBe(0);
  });
});
