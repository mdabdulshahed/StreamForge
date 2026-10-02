import type { StreamSource } from './stream-source.model';

/** Slugs for the catalog's genre taxonomy. */
export type CategoryId =
  'documentary' | 'animation' | 'action' | 'sci-fi' | 'sport' | 'nature' | 'music';

/** Editorial rails on the home page. A title may appear in several. */
export type CollectionId = 'featured' | 'trending' | 'live' | 'recent' | 'technical';

/** Maturity rating, shown on the details page. */
export type MaturityRating = 'G' | 'PG' | '12' | '16' | '18';

/**
 * A catalog entry.
 *
 * Extends `StreamSource` rather than wrapping it so any asset can be handed
 * straight to the player service without unwrapping, while the extra fields
 * stay invisible to the streaming layer.
 */
export interface VideoAsset extends StreamSource {
  readonly synopsis: string;
  readonly categories: readonly CategoryId[];
  readonly collections: readonly CollectionId[];
  /** Runtime in seconds. `null` for live streams, which have no fixed duration. */
  readonly durationSeconds: number | null;
  readonly isLive: boolean;
  readonly year: number;
  readonly rating: MaturityRating;
  /** Editorial score out of 100, used for the "match" chip. */
  readonly matchScore: number;
  readonly cast: readonly string[];
  readonly director: string;
  readonly tags: readonly string[];
  /** Highest resolution the source ladder is expected to offer, e.g. `1080p`. */
  readonly maxAdvertisedQuality: string;
  /**
   * Attribution for the public test stream backing this fictional title.
   * Every asset in the catalog is an openly published demo stream — this keeps
   * that provenance visible in the UI rather than buried in a comment.
   */
  readonly sourceCredit: string;
  /** Optional real poster URL. When absent the UI renders a procedural poster. */
  readonly poster?: string;
  /** True when the stream is known to carry a caption/subtitle track. */
  readonly hasCaptions: boolean;
  /** True when the manifest is DRM-protected. Nothing in this catalog is. */
  readonly isProtected: boolean;
}
