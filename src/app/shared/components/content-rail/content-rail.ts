import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

import type { VideoAsset } from '../../../core/models';
import { VideoCard } from '../video-card/video-card';

/**
 * Horizontally scrolling row of catalog tiles.
 *
 * Scrolling is native (`overflow-x` + scroll-snap) rather than a JS carousel:
 * it costs no main-thread work, keeps momentum scrolling on touch devices, and
 * remains keyboard- and screen-reader-navigable for free. The arrow buttons are
 * a pointer convenience layered on top and are hidden from assistive tech.
 */
@Component({
  selector: 'sf-content-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VideoCard],
  templateUrl: './content-rail.html',
  styleUrl: './content-rail.scss',
})
export class ContentRail {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
  readonly assets = input.required<readonly VideoAsset[]>();
  /** Renders a large ordinal on each tile, for "top 10"-style rows. */
  readonly ranked = input(false);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  /** Slug used to tie the heading to its rail via `aria-labelledby`. */
  protected readonly headingId = computed(
    () =>
      `rail-${this.heading()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,
  );

  constructor() {
    // Rails that already fit should show both arrows disabled from the start,
    // which we only know once the track has been laid out.
    afterNextRender(() => this.onScroll());
  }

  protected scrollBy(direction: -1 | 1): void {
    const el = this.track().nativeElement;
    // Page by ~90% of the viewport so a sliver of the next card stays visible,
    // which is the cue that tells users the row continues.
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  }

  protected onScroll(): void {
    const el = this.track().nativeElement;
    this.atStart.set(el.scrollLeft <= 8);
    this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }
}
