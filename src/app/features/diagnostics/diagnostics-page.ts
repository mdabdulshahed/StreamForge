import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PlaybackSessionRegistry } from '../../core/services/playback-session-registry.service';
import { DiagnosticsDashboard } from '../../shared/components/diagnostics-dashboard/diagnostics-dashboard';
import { DrmPipelinePanel } from '../../shared/components/drm-pipeline-panel/drm-pipeline-panel';
import { StreamingPipelinePanel } from '../../shared/components/streaming-pipeline-panel/streaming-pipeline-panel';

/**
 * Technical diagnostics dashboard route.
 *
 * Reads whichever session `PlaybackSessionRegistry` currently holds. Because
 * that registry only tracks a *mounted* player (see its doc comment —
 * there is no persistent-player architecture here), navigating here from
 * `/player/:id` stops playback, and this route will show the empty state
 * immediately after. That's a real, honestly-surfaced limitation: the
 * dashboard reads live data or says plainly that there is none, never a
 * stale or invented snapshot. `/player/:id` has its own "Diagnostics"
 * toggle that renders the same `DiagnosticsDashboard` in place, which is
 * the practical way to see it *while* watching something.
 *
 * `StreamingPipelinePanel` and `DrmPipelinePanel` render unconditionally
 * below it — both are static documentation, not session data, so neither
 * has anything to wait for.
 */
@Component({
  selector: 'sf-diagnostics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DiagnosticsDashboard, StreamingPipelinePanel, DrmPipelinePanel],
  template: `
    <div class="sf-gutter pt-20 pb-16 sm:pt-24">
      <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Diagnostics</h1>
      <p class="mt-1.5 max-w-xl text-sm text-mist-400">
        A live technical readout of the active playback session — real values only, nothing
        estimated.
      </p>

      @if (registry.session(); as session) {
        <div class="mt-6">
          <sf-diagnostics-dashboard [session]="session" />
        </div>
      } @else {
        <div class="mt-8 rounded-xl border border-white/8 bg-ink-900/60 p-6">
          <p class="text-sm font-medium text-mist-200">No active playback session</p>
          <p class="mt-2 max-w-md text-xs leading-relaxed text-mist-500">
            This page reflects whichever title is currently loaded in the player. Since navigating
            here stops any playback that was running, open a title and press play, then use its
            "Diagnostics" toggle to see this same dashboard alongside the video instead.
          </p>
          <a
            routerLink="/"
            class="mt-4 inline-flex items-center rounded-lg bg-ember-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-ember-400"
          >
            Browse the catalog
          </a>
        </div>
      }

      <div class="mt-10 rounded-xl border border-white/8 bg-ink-900/40 p-5 sm:p-6">
        <sf-streaming-pipeline-panel />
      </div>

      <div class="mt-6 rounded-xl border border-white/8 bg-ink-900/40 p-5 sm:p-6">
        <sf-drm-pipeline-panel />
      </div>
    </div>
  `,
})
export default class DiagnosticsPage {
  protected readonly registry = inject(PlaybackSessionRegistry);
}
