import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { VideoAsset } from '../../../core/models';
import { DurationPipe } from '../../pipes/duration.pipe';
import { PosterArt } from '../poster-art/poster-art';
import { ProtocolBadge } from '../protocol-badge/protocol-badge';

/**
 * A single catalog tile.
 *
 * The whole card is one anchor to the details page, so keyboard users get a
 * single tab stop with a real destination instead of a click-handled `div`.
 * Everything else inside is `aria-hidden` decoration or part of the link's
 * accessible name.
 */
@Component({
  selector: 'sf-video-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PosterArt, ProtocolBadge, DurationPipe],
  templateUrl: './video-card.html',
  styleUrl: './video-card.scss',
})
export class VideoCard {
  readonly asset = input.required<VideoAsset>();
  /** Ordinal shown as a large numeral, used by the "trending" rail. */
  readonly rank = input<number | null>(null);

  protected readonly meta = computed(() => {
    const a = this.asset();
    return [a.year.toString(), a.rating, a.maxAdvertisedQuality].join(' · ');
  });

  protected readonly linkLabel = computed(() => {
    const a = this.asset();
    return `${a.title}, ${a.isLive ? 'live' : a.year}. View details.`;
  });
}
