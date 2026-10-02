import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { VideoAsset } from '../../../core/models';
import { DurationPipe } from '../../pipes/duration.pipe';
import { PosterArt } from '../poster-art/poster-art';
import { ProtocolBadge } from '../protocol-badge/protocol-badge';

/** Full-bleed cinematic banner promoting one title at the top of the home page. */
@Component({
  selector: 'sf-hero-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PosterArt, ProtocolBadge, DurationPipe],
  templateUrl: './hero-banner.html',
  styleUrl: './hero-banner.scss',
})
export class HeroBanner {
  readonly asset = input.required<VideoAsset>();

  protected readonly metaLine = computed(() => {
    const a = this.asset();
    return [a.year.toString(), a.rating, a.maxAdvertisedQuality, a.director].filter(Boolean);
  });
}
