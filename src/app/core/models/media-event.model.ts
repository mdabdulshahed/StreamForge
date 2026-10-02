/**
 * The `HTMLMediaElement` events the player listens to.
 *
 * Matches the native event set exactly rather than a curated subset — the
 * point of `MediaEventsService` is to be the *one* place these are wired up,
 * so nothing is missing there that a future feature (analytics, diagnostics)
 * would otherwise have to attach its own listener for.
 */
export const MEDIA_EVENT_NAMES = [
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'playing',
  'waiting',
  'stalled',
  'seeking',
  'seeked',
  'pause',
  'play',
  'ended',
  'error',
  'timeupdate',
  'progress',
  'durationchange',
  'ratechange',
  'volumechange',
] as const;

export type MediaEventName = (typeof MEDIA_EVENT_NAMES)[number];

/**
 * Coarse playback state, derived from the raw event stream.
 *
 * This is deliberately a small enum rather than a 1:1 mirror of every native
 * event — it is what the UI (play/pause icon, buffering spinner, diagnostics
 * "State:" row) actually needs to render, not a log of what fired.
 */
export type PlaybackState =
  | 'idle'
  | 'paused'
  | 'playing'
  | 'buffering'
  | 'seeking'
  | 'ended'
  | 'error';

export interface BufferedRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Seconds of playable buffer immediately ahead of `currentTime`, using
 * whichever range actually contains it — `0` if none does (nothing
 * downloaded yet, or the ranges have a gap at the current position).
 *
 * Structurally compatible with Shaka's own `shaka.extern.BufferedRange`
 * (`{ start, end }`), so `StreamingPlayerService.getBufferedInfo()?.total`
 * can be passed straight in without an adapter.
 */
export function bufferAheadSeconds(ranges: readonly BufferedRange[], currentTime: number): number {
  for (const range of ranges) {
    if (currentTime >= range.start && currentTime <= range.end) {
      return range.end - currentTime;
    }
  }
  return 0;
}

/** The subset of `HTMLMediaElement` that `derivePlaybackState` needs. */
export interface MediaStateSnapshot {
  readonly paused: boolean;
  readonly ended: boolean;
}

/**
 * Folds one media event into the next `PlaybackState`.
 *
 * Pulled out as a pure function (previous state + event name + a minimal
 * snapshot in, next state out) so the transition logic can be unit tested
 * without a real `<video>` element — jsdom's `HTMLMediaElement` does not
 * implement enough of the media pipeline to drive this through real playback.
 *
 * Priority order, highest first: `error` > `ended` > `seeking` >
 * `waiting`/`stalled` > "is the element currently paused" > the event itself.
 * Purely informational events (`timeupdate`, `volumechange`, `ratechange`,
 * `progress`) never change the state on their own.
 */
export function derivePlaybackState(
  previous: PlaybackState,
  event: MediaEventName,
  snapshot: MediaStateSnapshot,
): PlaybackState {
  if (event === 'error') return 'error';
  if (snapshot.ended) return 'ended';
  if (event === 'seeking') return 'seeking';

  if (event === 'waiting' || event === 'stalled') {
    // A stall while paused (e.g. the browser prefetching) is not "buffering"
    // from the user's point of view — nothing was interrupted.
    return snapshot.paused ? 'paused' : 'buffering';
  }

  if (snapshot.paused) return 'paused';

  if (
    event === 'playing' ||
    event === 'seeked' ||
    event === 'canplay' ||
    event === 'loadedmetadata' ||
    event === 'loadeddata'
  ) {
    return 'playing';
  }

  return previous === 'idle' ? 'paused' : previous;
}
