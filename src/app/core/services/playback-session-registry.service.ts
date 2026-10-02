import { Injectable, signal } from '@angular/core';

import type { MediaEventsService } from './media-events.service';
import type { PlaybackAnalyticsService } from './playback-analytics.service';
import type { StreamingPlayerService } from './streaming-player.service';

/**
 * Bundles references to one active playback's component-scoped services,
 * plus just enough catalog context (title/id) to label them. Everything a
 * diagnostics view needs, from wherever it's rendered.
 */
export interface PlaybackSession {
  readonly assetId: string;
  readonly assetTitle: string;
  readonly events: MediaEventsService;
  readonly player: StreamingPlayerService;
  readonly analytics: PlaybackAnalyticsService;
}

/**
 * Root-scoped pointer to "whichever playback session is currently active,
 * if any" — the one piece of player-related state that genuinely needs to
 * outlive a single component, because the `/diagnostics` route is a
 * *different* route than `/player/:id`.
 *
 * Deliberately does **not** keep the player itself alive across navigation
 * — `VideoSurface` still owns the actual `<video>` element and its Shaka
 * instance, torn down by Angular exactly as before when its route
 * deactivates. This registry only holds *references* to that instance's
 * services while it's mounted, and is cleared when it isn't. That means
 * navigating from `/player/:id` to `/diagnostics` does stop playback — a
 * real, honestly-surfaced limitation (see `DiagnosticsPage`'s empty state)
 * rather than the larger persistent-mini-player architecture a "keep
 * playing while you browse diagnostics" experience would need. That's a
 * substantial, separate piece of scope, not something to bolt on here.
 */
@Injectable({ providedIn: 'root' })
export class PlaybackSessionRegistry {
  private readonly _session = signal<PlaybackSession | null>(null);
  readonly session = this._session.asReadonly();

  register(session: PlaybackSession): void {
    this._session.set(session);
  }

  /** No-ops if `current` isn't the session currently registered — guards against a stale unmount clearing a newer session. */
  clear(current: PlaybackSession): void {
    if (this._session() === current) {
      this._session.set(null);
    }
  }
}
