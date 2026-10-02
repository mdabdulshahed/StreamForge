/**
 * A selectable subtitle/caption track.
 *
 * Mirrors the subset of `shaka.extern.TextTrack` the UI needs. Whether a
 * title *has* captions is now determined by this list being non-empty once
 * the manifest is loaded — not by the catalog's declarative `hasCaptions`
 * flag, which only exists to describe a title before playback starts (e.g.
 * on the details page).
 */
export interface CaptionTrack {
  readonly id: number;
  readonly active: boolean;
  readonly language: string;
  readonly label: string | null;
  /** Typically `'caption'` or `'subtitle'`. */
  readonly kind: string | null;
}
