import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Category } from '../../../core/models';

/** Gradient tile linking to a filtered view of one genre. */
@Component({
  selector: 'sf-category-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block' },
  template: `
    <a
      class="tile group relative flex aspect-16/9 flex-col justify-end overflow-hidden rounded-card p-3.5 ring-1 ring-white/8 transition-transform duration-300 ease-(--ease-out-soft) hover:-translate-y-1 focus-visible:-translate-y-1 sm:aspect-16/7"
      [routerLink]="['/']"
      [fragment]="'category-' + category().id"
      [style.background-image]="background()"
    >
      <span
        aria-hidden="true"
        class="absolute inset-0 bg-ink-950/25 transition-opacity duration-300 group-hover:opacity-0"
      ></span>
      <span class="relative text-base font-semibold text-white drop-shadow">
        {{ category().label }}
      </span>
      <span class="relative mt-0.5 text-xs leading-snug text-white/75">
        {{ count() }} {{ count() === 1 ? 'title' : 'titles' }}
      </span>
    </a>
  `,
})
export class CategoryTile {
  readonly category = input.required<Category>();
  readonly count = input.required<number>();

  protected readonly background = computed(() => {
    const [from, to] = this.category().gradient;
    return `linear-gradient(140deg, ${from} 0%, ${to} 100%)`;
  });
}
