import { Injectable, OnDestroy, signal } from '@angular/core';

import {
  MEDIA_EVENT_NAMES,
  derivePlaybackState,
  type BufferedRange,
  type MediaEventName,
  type PlaybackState,
} from '../models';

/**
 * The single point where native `HTMLMediaElement` events are listened to.
 *
 * Not `providedIn: 'root'` — playback state is per `<video>` element, so this
 * is provided at `VideoSurface`'s component level and Angular destroys it
 * (running `ngOnDestroy`, which detaches the listeners) automatically when
 * that component is torn down.
 *
 * Everything else in the app — the control bar, keyboard shortcuts, and
 * eventually diagnostics/analytics — reads playback state from the signals
 * here rather than attaching its own event listeners.
 */
@Injectable()
export class MediaEventsService implements OnDestroy {
  private video: HTMLVideoElement | null = null;
  private readonly unlisten: Array<() => void> = [];

  readonly state = signal<PlaybackState>('idle');
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly buffered = signal<readonly BufferedRange[]>([]);
  readonly volume = signal(1);
  readonly muted = signal(false);
  readonly playbackRate = signal(1);
  readonly error = signal<MediaError | null>(null);

  attach(video: HTMLVideoElement): void {
    this.detach();
    this.video = video;

    // Pick up whatever the element already has (e.g. default volume) before
    // the first event fires.
    this.volume.set(video.volume);
    this.muted.set(video.muted);
    this.playbackRate.set(video.playbackRate);

    for (const name of MEDIA_EVENT_NAMES) {
      const handler = () => this.handle(name);
      video.addEventListener(name, handler);
      this.unlisten.push(() => video.removeEventListener(name, handler));
    }
  }

  detach(): void {
    for (const off of this.unlisten) off();
    this.unlisten.length = 0;
    this.video = null;
  }

  ngOnDestroy(): void {
    this.detach();
  }

  private handle(name: MediaEventName): void {
    const video = this.video;
    if (!video) return;

    this.state.set(
      derivePlaybackState(this.state(), name, { paused: video.paused, ended: video.ended }),
    );

    switch (name) {
      case 'timeupdate':
        this.currentTime.set(video.currentTime);
        break;
      case 'durationchange':
        this.duration.set(Number.isFinite(video.duration) ? video.duration : 0);
        break;
      case 'progress':
      case 'seeked':
        // Buffered ranges change on both download progress and after a seek
        // jumps into an already-buffered region.
        this.buffered.set(toRanges(video.buffered));
        break;
      case 'ratechange':
        this.playbackRate.set(video.playbackRate);
        break;
      case 'volumechange':
        this.volume.set(video.volume);
        this.muted.set(video.muted);
        break;
      case 'error':
        this.error.set(video.error);
        break;
    }
  }
}

function toRanges(ranges: TimeRanges): readonly BufferedRange[] {
  const out: BufferedRange[] = [];
  for (let i = 0; i < ranges.length; i++) {
    out.push({ start: ranges.start(i), end: ranges.end(i) });
  }
  return out;
}
