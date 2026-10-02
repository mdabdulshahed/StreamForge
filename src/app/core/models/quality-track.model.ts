/**
 * A single playable rendition — Shaka's "variant" track, i.e. one
 * audio+video combination at a particular bitrate/resolution.
 *
 * Mirrors the subset of `shaka.extern.Track` the UI actually needs, kept as
 * our own type rather than importing Shaka's directly. That keeps the
 * quality menu (Phase 6) and diagnostics (Phase 7) decoupled from Shaka's
 * wider track shape, which also covers audio-only, text and image tracks.
 */
export interface QualityTrack {
  readonly id: number;
  readonly active: boolean;
  readonly height: number | null;
  readonly width: number | null;
  /** Bits per second, as declared by the manifest. */
  readonly bandwidth: number;
  readonly frameRate: number | null;
  readonly videoCodec: string | null;
  /** Human label, e.g. `"1080p"` or `"Audio only"`. */
  readonly label: string;
}

export function qualityLabel(height: number | null): string {
  return height ? `${height}p` : 'Audio only';
}

/**
 * Reduces a raw variant-track list to one representative entry per distinct
 * resolution, highest-bandwidth first — what a quality menu actually shows.
 *
 * A manifest can carry several variants at the same resolution (most often
 * alternate audio paired with the same video rendition); spec section 15
 * asks for "only qualities actually available", i.e. one row per resolution
 * a user can meaningfully choose, not one per underlying audio+video
 * combination.
 */
export function distinctQualityLevels(tracks: readonly QualityTrack[]): readonly QualityTrack[] {
  const byHeight = new Map<number, QualityTrack>();
  for (const track of tracks) {
    const key = track.height ?? -1;
    const existing = byHeight.get(key);
    if (!existing || track.bandwidth > existing.bandwidth) {
      byHeight.set(key, track);
    }
  }
  return Array.from(byHeight.values()).sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
}
