import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CatalogService } from '../../core/services/catalog.service';
import { CategoryTile } from '../../shared/components/category-tile/category-tile';
import { ContentRail } from '../../shared/components/content-rail/content-rail';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { RailSkeleton } from '../../shared/components/rail-skeleton/rail-skeleton';

/**
 * Home / dashboard.
 *
 * A pure projection of `CatalogService`: no data shaping happens here beyond
 * choosing which rail is "ranked". The `loading` flag exists so the skeleton
 * treatment is exercised on a cold load rather than being dead code that only
 * appears once the catalog moves behind a real API.
 */
@Component({
  selector: 'sf-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroBanner, ContentRail, CategoryTile, RailSkeleton],
  templateUrl: './home.html',
})
export default class Home {
  private readonly catalog = inject(CatalogService);

  protected readonly loading = signal(false);
  protected readonly hero = this.catalog.heroAsset;
  protected readonly rows = this.catalog.rows;

  protected readonly categories = computed(() =>
    this.catalog.categories.map((category) => ({
      category,
      count: this.catalog.byCategory(category.id).length,
    })),
  );

  /** The trending rail is the only one that shows ordinal numerals. */
  protected isRanked(collectionId: string): boolean {
    return collectionId === 'trending';
  }
}
