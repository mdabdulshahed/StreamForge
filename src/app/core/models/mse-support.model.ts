/**
 * Media Source Extensions capability detection (spec section 10).
 *
 * Two APIs matter: standard `MediaSource` (Chrome/Firefox/Edge/desktop
 * Safari) and `ManagedMediaSource` — the newer, more restricted API iOS
 * Safari actually requires. Plain `MediaSource` arrived late and
 * inconsistently on iOS; a check that only tested `window.MediaSource`
 * would wrongly report iOS Safari as unsupported even where playback
 * works fine through the managed variant. `ManagedMediaSource` isn't in
 * TypeScript's bundled DOM types yet (too new), hence the local cast.
 */
export interface MseSupport {
  readonly mediaSource: boolean;
  readonly managedMediaSource: boolean;
  /** Whichever API is actually needed for MSE-based playback to work here. */
  readonly supported: boolean;
}

interface WindowWithManagedMediaSource {
  readonly ManagedMediaSource?: unknown;
}

export function detectMseSupport(): MseSupport {
  const mediaSource = typeof window.MediaSource !== 'undefined';
  const managedMediaSource =
    typeof (window as unknown as WindowWithManagedMediaSource).ManagedMediaSource !== 'undefined';

  return { mediaSource, managedMediaSource, supported: mediaSource || managedMediaSource };
}
