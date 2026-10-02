import { inject } from '@angular/core';
import { Router, type ResolveFn } from '@angular/router';
import { map } from 'rxjs';

import type { VideoAsset } from '../models';
import { CatalogService } from '../services/catalog.service';

/**
 * Resolves `:id` to a `VideoAsset` before the route activates.
 *
 * Resolving here rather than inside the component means the details and player
 * pages can declare `input.required<VideoAsset>()` — no null checks, no
 * "loading" branch in every template. An unknown id is redirected to the 404
 * route and the navigation is cancelled by returning an empty observable.
 */
export const assetResolver: ResolveFn<VideoAsset> = (route) => {
  const catalog = inject(CatalogService);
  const router = inject(Router);
  const id = route.paramMap.get('id') ?? '';

  return catalog.loadById(id).pipe(
    map((asset) => {
      if (!asset) {
        // `skipLocationChange` keeps the bad URL in the address bar, so the user
        // can see and correct what they navigated to.
        void router.navigate(['/not-found'], { skipLocationChange: true });
        throw new Error(`Unknown asset: ${id}`);
      }
      return asset;
    }),
  );
};
