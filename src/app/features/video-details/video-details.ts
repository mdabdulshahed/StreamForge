import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { VideoAsset } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ContentRail } from '../../shared/components/content-rail/content-rail';
import { PosterArt } from '../../shared/components/poster-art/poster-art';
import { ProtocolBadge } from '../../shared/components/protocol-badge/protocol-badge';
import { DurationPipe } from '../../shared/pipes/duration.pipe';

interface DetailFact {
  readonly label: string;
  readonly value: string;
  /** Renders the value in the mono face — used for URLs and technical values. */
  readonly mono?: boolean;
}

/**
 * Video details page.
 *
 * `asset` arrives via router *component input binding* — the route resolver
 * looks the title up, so this component never touches `ActivatedRoute` and can
 * be rendered in isolation by passing an input.
 */
@Component({
  selector: 'sf-video-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PosterArt, ProtocolBadge, ContentRail, DurationPipe],
  templateUrl: './video-details.html',
})
export default class VideoDetails {
  private readonly catalog = inject(CatalogService);

  /** Resolved by `assetResolver`; guaranteed non-null by the route guard. */
  readonly asset = input.required<VideoAsset>();

  protected readonly related = computed(() => this.catalog.related(this.asset()));

  protected readonly categoryLabels = computed(() =>
    this.asset().categories.map((id) => this.catalog.categoryLabel(id)),
  );

  /** Technical facts, mirroring what the diagnostics page will later measure live. */
  protected readonly facts = computed<readonly DetailFact[]>(() => {
    const a = this.asset();
    return [
      { label: 'Delivery protocol', value: a.type === 'dash' ? 'MPEG-DASH' : 'HLS' },
      { label: 'Manifest', value: a.manifestUrl, mono: true },
      { label: 'Presentation', value: a.isLive ? 'Live (rolling window)' : 'Video on demand' },
      { label: 'Top rendition', value: a.maxAdvertisedQuality },
      { label: 'Subtitles', value: a.hasCaptions ? 'Available' : 'None in this stream' },
      { label: 'Content protection', value: a.isProtected ? 'DRM protected' : 'Clear (no DRM)' },
      { label: 'Source', value: a.sourceCredit },
    ];
  });
}
