import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { CATALOG, CATEGORIES, COLLECTIONS } from '../data/catalog.data';
import type {
  Category,
  CategoryId,
  Collection,
  CollectionId,
  ContentRow,
  VideoAsset,
} from '../models';

/**
 * Read-only access to the StreamForge catalog.
 *
 * Backed by a local constant today. The public surface is deliberately shaped
 * like a remote API — lookups return `undefined` for misses and the async entry
 * points return observables — so swapping in an HTTP backend later is a change
 * to this file alone, not to every consumer.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  /** Simulated network latency for the async API, so loading states are real. */
  private static readonly FAKE_LATENCY_MS = 320;

  private readonly assets = signal<readonly VideoAsset[]>(CATALOG);

  /** Every title in the catalog. */
  readonly all = this.assets.asReadonly();

  readonly categories: readonly Category[] = CATEGORIES;
  readonly collections: readonly Collection[] = COLLECTIONS;

  /** Index for O(1) lookups by id, rebuilt whenever the catalog changes. */
  private readonly byId = computed(() => new Map(this.assets().map((a) => [a.id, a])));

  /** The single title promoted in the home page hero. */
  readonly heroAsset = computed<VideoAsset | undefined>(
    () => this.assets().find((a) => a.collections.includes('featured')) ?? this.assets()[0],
  );

  /** Every collection paired with its assets, empty rails removed. */
  readonly rows = computed<readonly ContentRow[]>(() =>
    this.collections
      .map((collection) => ({
        collection,
        assets: this.assets().filter((a) => a.collections.includes(collection.id)),
      }))
      .filter((row) => row.assets.length > 0),
  );

  getById(id: string): VideoAsset | undefined {
    return this.byId().get(id);
  }

  /**
   * Async lookup used by the route resolver.
   * Emits `undefined` for an unknown id rather than erroring — a missing title
   * is a routing concern (404 page), not an exception.
   */
  loadById(id: string): Observable<VideoAsset | undefined> {
    return of(this.getById(id)).pipe(delay(CatalogService.FAKE_LATENCY_MS));
  }

  byCollection(id: CollectionId): readonly VideoAsset[] {
    return this.assets().filter((a) => a.collections.includes(id));
  }

  byCategory(id: CategoryId): readonly VideoAsset[] {
    return this.assets().filter((a) => a.categories.includes(id));
  }

  /**
   * Titles related to `asset`: shares at least one category, ranked by how many
   * categories overlap, then by editorial score. Excludes the asset itself.
   */
  related(asset: VideoAsset, limit = 6): readonly VideoAsset[] {
    return this.assets()
      .filter((a) => a.id !== asset.id && a.categories.some((c) => asset.categories.includes(c)))
      .map((a) => ({
        asset: a,
        overlap: a.categories.filter((c) => asset.categories.includes(c)).length,
      }))
      .sort((x, y) => y.overlap - x.overlap || y.asset.matchScore - x.asset.matchScore)
      .slice(0, limit)
      .map((entry) => entry.asset);
  }

  /** Case-insensitive match across title, tags and categories. */
  search(term: string): readonly VideoAsset[] {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    return this.assets().filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle) ||
        a.tags.some((t) => t.toLowerCase().includes(needle)) ||
        a.categories.some((c) => c.includes(needle)),
    );
  }

  categoryLabel(id: CategoryId): string {
    return this.categories.find((c) => c.id === id)?.label ?? id;
  }
}
