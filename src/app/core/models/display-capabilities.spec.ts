import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectDisplayCapabilities } from './display-capabilities.model';

describe('detectDisplayCapabilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports both unsupported when the browser exposes neither flag', () => {
    const capabilities = detectDisplayCapabilities();
    expect(capabilities.fullscreen).toBe(false);
    expect(capabilities.pictureInPicture).toBe(false);
  });

  it('reads fullscreenEnabled when present', () => {
    vi.stubGlobal('document', { ...document, fullscreenEnabled: true, pictureInPictureEnabled: false });
    expect(detectDisplayCapabilities().fullscreen).toBe(true);
  });

  it('reads pictureInPictureEnabled when present', () => {
    vi.stubGlobal('document', { ...document, fullscreenEnabled: false, pictureInPictureEnabled: true });
    expect(detectDisplayCapabilities().pictureInPicture).toBe(true);
  });
});
