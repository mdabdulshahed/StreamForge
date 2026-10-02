import { describe, expect, it } from 'vitest';

import { distinctQualityLevels, qualityLabel, type QualityTrack } from './quality-track.model';

function track(overrides: Partial<QualityTrack>): QualityTrack {
  return {
    id: 0,
    active: false,
    height: null,
    width: null,
    bandwidth: 0,
    frameRate: null,
    videoCodec: null,
    label: '',
    ...overrides,
  };
}

describe('qualityLabel', () => {
  it('formats a resolution as "<height>p"', () => {
    expect(qualityLabel(1080)).toBe('1080p');
    expect(qualityLabel(720)).toBe('720p');
  });

  it('labels an audio-only track (no height) distinctly', () => {
    expect(qualityLabel(null)).toBe('Audio only');
  });
});

describe('distinctQualityLevels', () => {
  it('collapses multiple variants at the same resolution into one row', () => {
    const tracks = [
      track({ id: 1, height: 1080, bandwidth: 5_000_000 }),
      track({ id: 2, height: 1080, bandwidth: 5_200_000 }), // alternate audio, same video
      track({ id: 3, height: 720, bandwidth: 2_500_000 }),
    ];
    const levels = distinctQualityLevels(tracks);
    expect(levels).toHaveLength(2);
    expect(levels.map((t) => t.height)).toEqual([1080, 720]);
  });

  it('keeps the highest-bandwidth variant as the representative for a resolution', () => {
    const tracks = [
      track({ id: 1, height: 1080, bandwidth: 5_000_000 }),
      track({ id: 2, height: 1080, bandwidth: 5_200_000 }),
    ];
    expect(distinctQualityLevels(tracks)[0].id).toBe(2);
  });

  it('sorts highest resolution first', () => {
    const tracks = [
      track({ id: 1, height: 360 }),
      track({ id: 2, height: 1080 }),
      track({ id: 3, height: 720 }),
    ];
    expect(distinctQualityLevels(tracks).map((t) => t.height)).toEqual([1080, 720, 360]);
  });

  it('treats audio-only tracks (null height) as their own group', () => {
    const tracks = [track({ id: 1, height: null }), track({ id: 2, height: 480 })];
    expect(distinctQualityLevels(tracks)).toHaveLength(2);
  });

  it('returns an empty list for an empty input, e.g. before a manifest has loaded', () => {
    expect(distinctQualityLevels([])).toEqual([]);
  });
});
