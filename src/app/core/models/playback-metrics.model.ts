import type { PlaybackState } from './media-event.model';

/**
 * Cumulative playback telemetry for the current session.
 *
 * Mirrors spec's `PlaybackMetrics` example. Everything here is counted or
 * timed from real `PlaybackState` transitions — nothing is estimated or
 * invented. Fields Shaka itself already tracks authoritatively (dropped
 * frames, estimated bandwidth) are deliberately *not* duplicated here; they
 * come from `StreamingPlayerService.getStats()`/`getBufferedInfo()` polling
 * instead, read directly by whatever displays them.
 */
export interface PlaybackMetrics {
  readonly manifestLoadTimeMs: number | null;
  readonly startupTimeMs: number | null;
  readonly rebufferCount: number;
  readonly totalRebufferDurationMs: number;
  readonly qualitySwitches: number;
  readonly seekCount: number;
  readonly pauseCount: number;
  readonly resumeCount: number;
  readonly errorCount: number;
  readonly completed: boolean;
}

export const INITIAL_PLAYBACK_METRICS: PlaybackMetrics = {
  manifestLoadTimeMs: null,
  startupTimeMs: null,
  rebufferCount: 0,
  totalRebufferDurationMs: 0,
  qualitySwitches: 0,
  seekCount: 0,
  pauseCount: 0,
  resumeCount: 0,
  errorCount: 0,
  completed: false,
};

/**
 * `PlaybackAnalyticsService`'s full working state — the public `metrics`
 * plus the private timing bookkeeping needed to compute them. Kept as one
 * plain object (not scattered instance fields) so the transition logic
 * below can be pure and unit-tested without a real player.
 */
export interface AnalyticsState {
  readonly metrics: PlaybackMetrics;
  readonly loadStartedAtMs: number | null;
  readonly rebufferStartedAtMs: number | null;
  /** When the manifest became ready — the startup-time clock's zero point. */
  readonly playbackRequestedAtMs: number | null;
  readonly hasReachedFirstFrame: boolean;
}

export const INITIAL_ANALYTICS_STATE: AnalyticsState = {
  metrics: INITIAL_PLAYBACK_METRICS,
  loadStartedAtMs: null,
  rebufferStartedAtMs: null,
  playbackRequestedAtMs: null,
  hasReachedFirstFrame: false,
};

/** Call when `StreamingPlayerService.loading` transitions to `true`. */
export function reduceOnLoadStart(state: AnalyticsState, timestampMs: number): AnalyticsState {
  return { ...state, loadStartedAtMs: timestampMs };
}

/**
 * Call when `loading` transitions back to `false`. Records manifest load
 * time and starts the startup-time clock — playback can only begin once
 * the manifest is ready, so that's the fair zero point for "how long until
 * the first frame", not component mount time.
 */
export function reduceOnLoadComplete(state: AnalyticsState, timestampMs: number): AnalyticsState {
  if (state.loadStartedAtMs === null) return state;
  return {
    ...state,
    loadStartedAtMs: null,
    playbackRequestedAtMs: timestampMs,
    metrics: { ...state.metrics, manifestLoadTimeMs: timestampMs - state.loadStartedAtMs },
  };
}

/**
 * Call on every `PlaybackState` transition. `from`/`to` must differ — the
 * caller is expected to only invoke this when the state actually changed,
 * the same discipline `MediaEventsService` already applies to its own
 * signal writes.
 */
export function reduceOnStateChange(
  state: AnalyticsState,
  from: PlaybackState,
  to: PlaybackState,
  timestampMs: number,
): AnalyticsState {
  let { metrics, rebufferStartedAtMs, hasReachedFirstFrame, playbackRequestedAtMs } = state;

  if (to === 'buffering' && from !== 'buffering') {
    rebufferStartedAtMs = timestampMs;
    // The first wait for data is startup latency, not a rebuffer — a
    // rebuffer is specifically an interruption of playback that had
    // already begun.
    if (hasReachedFirstFrame) {
      metrics = { ...metrics, rebufferCount: metrics.rebufferCount + 1 };
    }
  }

  if (from === 'buffering' && to !== 'buffering' && rebufferStartedAtMs !== null) {
    if (hasReachedFirstFrame) {
      metrics = {
        ...metrics,
        totalRebufferDurationMs: metrics.totalRebufferDurationMs + (timestampMs - rebufferStartedAtMs),
      };
    }
    rebufferStartedAtMs = null;
  }

  if (to === 'playing' && !hasReachedFirstFrame) {
    hasReachedFirstFrame = true;
    if (playbackRequestedAtMs !== null) {
      metrics = { ...metrics, startupTimeMs: timestampMs - playbackRequestedAtMs };
    }
  }

  if (to === 'seeking' && from !== 'seeking') {
    metrics = { ...metrics, seekCount: metrics.seekCount + 1 };
  }
  if (to === 'paused' && from === 'playing') {
    metrics = { ...metrics, pauseCount: metrics.pauseCount + 1 };
  }
  if (to === 'playing' && from === 'paused') {
    metrics = { ...metrics, resumeCount: metrics.resumeCount + 1 };
  }
  if (to === 'ended') {
    metrics = { ...metrics, completed: true };
  }
  if (to === 'error') {
    metrics = { ...metrics, errorCount: metrics.errorCount + 1 };
  }

  return { ...state, metrics, rebufferStartedAtMs, hasReachedFirstFrame, playbackRequestedAtMs };
}

/** Call whenever the active quality track's id changes (an ABR or manual switch). */
export function reduceOnQualitySwitch(state: AnalyticsState): AnalyticsState {
  return { ...state, metrics: { ...state.metrics, qualitySwitches: state.metrics.qualitySwitches + 1 } };
}
