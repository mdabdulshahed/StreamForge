import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectEmeSupport } from './eme-support.model';

describe('detectEmeSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unavailable when requestMediaKeySystemAccess does not exist', async () => {
    vi.stubGlobal('navigator', {});
    const support = await detectEmeSupport();
    expect(support.available).toBe(false);
    expect(support.widevine).toBe(false);
  });

  it('reports widevine support when the probe resolves', async () => {
    vi.stubGlobal('navigator', {
      requestMediaKeySystemAccess: vi.fn().mockResolvedValue({}),
    });
    const support = await detectEmeSupport();
    expect(support.available).toBe(true);
    expect(support.widevine).toBe(true);
  });

  it('reports EME available but no widevine when the probe rejects', async () => {
    vi.stubGlobal('navigator', {
      requestMediaKeySystemAccess: vi.fn().mockRejectedValue(new DOMException('', 'NotSupportedError')),
    });
    const support = await detectEmeSupport();
    expect(support.available).toBe(true);
    expect(support.widevine).toBe(false);
  });

  it('passes the widevine key system id to the probe', async () => {
    const probe = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { requestMediaKeySystemAccess: probe });
    await detectEmeSupport();
    expect(probe).toHaveBeenCalledWith('com.widevine.alpha', expect.any(Array));
  });
});
