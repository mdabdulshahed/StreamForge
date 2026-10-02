import { describe, expect, it } from 'vitest';

import { detectProtocol } from './stream-source.model';

describe('detectProtocol', () => {
  it('recognises HLS playlists', () => {
    expect(detectProtocol('https://example.com/master.m3u8')).toBe('hls');
  });

  it('recognises DASH manifests', () => {
    expect(detectProtocol('https://example.com/stream.mpd')).toBe('dash');
  });

  it('ignores query strings and fragments, which signed manifests always carry', () => {
    expect(detectProtocol('https://cdn.example.com/a/b.m3u8?token=abc&exp=1')).toBe('hls');
    expect(detectProtocol('https://cdn.example.com/a/b.mpd#t=10')).toBe('dash');
  });

  it('is case-insensitive', () => {
    expect(detectProtocol('https://example.com/MASTER.M3U8')).toBe('hls');
  });

  it('returns null for anything it cannot classify', () => {
    expect(detectProtocol('https://example.com/video.mp4')).toBeNull();
    expect(detectProtocol('')).toBeNull();
  });
});
