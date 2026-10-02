import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Skeleton } from '../skeleton/skeleton';

/** Loading placeholder shaped like a `sf-content-rail`, to avoid layout shift. */
@Component({
  selector: 'sf-rail-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: { class: 'block py-2' },
  template: `
    <div class="sf-gutter mb-3">
      <sf-skeleton width="11rem" height="1.5rem" />
    </div>
    <div class="sf-rail">
      @for (i of placeholders(); track i) {
        <div class="min-w-0">
          <sf-skeleton height="auto" radius="var(--radius-card)" class="aspect-video" />
          <sf-skeleton width="70%" height="0.875rem" class="mt-2.5" />
          <sf-skeleton width="45%" height="0.75rem" class="mt-1.5" />
        </div>
      }
    </div>
  `,
})
export class RailSkeleton {
  readonly count = input(6);
  protected readonly placeholders = computed(() =>
    Array.from({ length: this.count() }, (_, i) => i),
  );
}
