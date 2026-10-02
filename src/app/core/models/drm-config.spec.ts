import { describe, expect, it } from 'vitest';

import { resolveDrmServers } from './drm-config.model';

const EMPTY_SERVERS = {
  'com.widevine.alpha': '',
  'com.microsoft.playready': '',
  'com.apple.fps': '',
};

describe('resolveDrmServers', () => {
  it('returns null when disabled, regardless of configured servers', () => {
    expect(
      resolveDrmServers({
        enabled: false,
        servers: { ...EMPTY_SERVERS, 'com.widevine.alpha': 'https://license.example.com' },
      }),
    ).toBeNull();
  });

  it('returns null when enabled but every server URL is empty', () => {
    expect(resolveDrmServers({ enabled: true, servers: EMPTY_SERVERS })).toBeNull();
  });

  it('returns only the non-empty servers when enabled', () => {
    const result = resolveDrmServers({
      enabled: true,
      servers: { ...EMPTY_SERVERS, 'com.widevine.alpha': 'https://license.example.com' },
    });
    expect(result).toEqual({ 'com.widevine.alpha': 'https://license.example.com' });
  });
});
