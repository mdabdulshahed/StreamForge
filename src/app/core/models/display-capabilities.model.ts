/**
 * Fullscreen and Picture-in-Picture capability detection (spec section 17's
 * "Browser APIs" row set, alongside MSE/EME). Both are plain, synchronous
 * boolean flags — unlike EME there is nothing to negotiate, so this mirrors
 * `detectMseSupport()`'s shape rather than `detectEmeSupport()`'s.
 */
export interface DisplayCapabilities {
  readonly fullscreen: boolean;
  readonly pictureInPicture: boolean;
}

export function detectDisplayCapabilities(): DisplayCapabilities {
  return {
    fullscreen: document.fullscreenEnabled ?? false,
    pictureInPicture: document.pictureInPictureEnabled ?? false,
  };
}
