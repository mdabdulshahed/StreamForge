import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectMseSupport } from './mse-support.model';

describe('detectMseSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported when neither API exists', () => {
    vi.stubGlobal('MediaSource', undefined);
    const support = detectMseSupport();
    expect(support.mediaSource).toBe(false);
    expect(support.supported).toBe(false);
  });

  it('reports MediaSource support when the constructor is present', () => {
    vi.stubGlobal('MediaSource', class {});
    expect(detectMseSupport().mediaSource).toBe(true);
    expect(detectMseSupport().supported).toBe(true);
  });

  it('is supported overall via ManagedMediaSource alone, e.g. iOS Safari', () => {
    vi.stubGlobal('MediaSource', undefined);
    vi.stubGlobal('ManagedMediaSource', class {});
    const support = detectMseSupport();
    expect(support.mediaSource).toBe(false);
    expect(support.managedMediaSource).toBe(true);
    expect(support.supported).toBe(true);
  });
});
