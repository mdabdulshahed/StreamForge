import { Injectable, effect, inject, signal } from '@angular/core';

import {
  INITIAL_ANALYTICS_STATE,
  reduceOnLoadComplete,
  reduceOnLoadStart,
  reduceOnQualitySwitch,
  reduceOnStateChange,
  type AnalyticsState,
  type PlaybackMetrics,
} from '../models';
import { MediaEventsService } from './media-events.service';
import { StreamingPlayerService } from './streaming-player.service';

/**
 * Records playback telemetry for the current session (spec section 8).
 *
 * Provided at `VideoSurface`'s component level, alongside
 * `MediaEventsService`/`StreamingPlayerService` — one analytics session per
 * `<video>` element, reset when a new one is created. All the actual
 * transition logic lives in the pure reducer functions in
 * `playback-metrics.model.ts`; this service is deliberately thin glue that
 * watches the two sibling services' signals via `effect()` and folds each
 * change through the reducer, matching the same "pure function does the
 * work, service just wires events to it" shape as `MediaEventsService` +
 * `derivePlaybackState`.
 */
@Injectable()
export class PlaybackAnalyticsService {
  private readonly events = inject(MediaEventsService);
  private readonly player = inject(StreamingPlayerService);

  readonly metrics = signal<PlaybackMetrics>(INITIAL_ANALYTICS_STATE.metrics);

  private state: AnalyticsState = INITIAL_ANALYTICS_STATE;

  constructor() {
    let previousLoading = false;
    let previousPlaybackState = this.events.state();
    let previousActiveTrackId: number | null = null;

    effect(() => {
      const loading = this.player.loading();
      const now = performance.now();

      if (loading && !previousLoading) {
        this.apply(reduceOnLoadStart(this.state, now));
      } else if (!loading && previousLoading) {
        this.apply(reduceOnLoadComplete(this.state, now));
      }
      previousLoading = loading;
    });

    effect(() => {
      const current = this.events.state();
      if (current !== previousPlaybackState) {
        this.apply(reduceOnStateChange(this.state, previousPlaybackState, current, performance.now()));
        previousPlaybackState = current;
      }
    });

    effect(() => {
      const active = this.player.activeTrack();
      if (active) {
        if (previousActiveTrackId !== null && active.id !== previousActiveTrackId) {
          this.apply(reduceOnQualitySwitch(this.state));
        }
        previousActiveTrackId = active.id;
      }
    });
  }

  private apply(next: AnalyticsState): void {
    this.state = next;
    this.metrics.set(next.metrics);
  }
}
