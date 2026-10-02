import type { CategoryId, CollectionId, VideoAsset } from './video-asset.model';

export interface Category {
  readonly id: CategoryId;
  readonly label: string;
  readonly description: string;
  /** Two stops driving the category tile's gradient. */
  readonly gradient: readonly [string, string];
}

export interface Collection {
  readonly id: CollectionId;
  readonly label: string;
  readonly subtitle: string;
}

/** A named rail plus the resolved assets in it — what the home page renders. */
export interface ContentRow {
  readonly collection: Collection;
  readonly assets: readonly VideoAsset[];
}
