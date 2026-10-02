import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';

import { clampSeekTarget } from '../../../../core/models';
import { MediaEventsService } from '../../../../core/services/media-events.service';
import { PlaybackAnalyticsService } from '../../../../core/services/playback-analytics.service';
import { StreamingPlayerService } from '../../../../core/services/streaming-player.service';

/**
 * Owns the native `<video>` element and nothing else.
 *
 * All playback intelligence lives elsewhere: native event state derivation
 * in `MediaEventsService`, manifest loading and Shaka-specific concerns in
 * `StreamingPlayerService`, cumulative telemetry in
 * `PlaybackAnalyticsService` (all three provided here, one set per
 * surface). `ControlBar` never touches the DOM directly — it reads
 * `events`/`player` and emits outputs that a parent wires to the
 * imperative methods below.
 */
@Component({
  selector: 'sf-video-surface',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MediaEventsService, StreamingPlayerService, PlaybackAnalyticsService],
  host: { class: 'absolute inset-0 block bg-black' },
  template: `
    <video
      #videoEl
      class="h-full w-full object-contain"
      playsinline
      [poster]="poster() ?? ''"
      (contextmenu)="$event.preventDefault()"
    ></video>
  `,
})
export class VideoSurface {
  readonly manifestUrl = input.required<string>();
  readonly poster = input<string | undefined>(undefined);

  /** Public so a parent can bind `ControlBar` inputs and drive keyboard shortcuts. */
  readonly events = inject(MediaEventsService);
  /** Public so a parent can read Shaka state (tracks, protocol, errors). */
  readonly player = inject(StreamingPlayerService);
  /** Public so a parent can register this session with `PlaybackSessionRegistry`. */
  readonly analytics = inject(PlaybackAnalyticsService);

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  private attached = false;
  private lastRequestedUrl: string | null = null;

  constructor() {
    effect(() => {
      const ref = this.videoRef();
      const url = this.manifestUrl();
      // `viewChild` resolves to `undefined` until the view has initialised;
      // this effect reruns once it does, since reading a signal inside an
      // effect subscribes to it. `player.manifestUrl()` is deliberately not
      // read here — it would make this effect depend on its own write.
      if (!ref) return;

      const video = ref.nativeElement;
      if (!this.attached) {
        this.events.attach(video);
        this.attached = true;
        this.lastRequestedUrl = url;
        void this.player.attach(video).then(() => this.player.load(url));
        return;
      }
      if (this.lastRequestedUrl !== url) {
        this.lastRequestedUrl = url;
        void this.player.load(url);
      }
    });
  }

  play(): void {
    this.videoRef()?.nativeElement.play().catch(() => {
      // A rejected play() (autoplay policy, no user gesture yet) already
      // shows up as `events.state()` staying 'paused' — nothing further to
      // do here until Phase 16's user-facing error handling.
    });
  }

  pause(): void {
    this.videoRef()?.nativeElement.pause();
  }

  togglePlay(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    if (video.paused || video.ended) this.play();
    else this.pause();
  }

  /**
   * Clamps against Shaka's `seekRange()` when available, not the native
   * element's `duration`. This matters for live content: `duration` is
   * unreliable (often `Infinity`) for a live stream, whereas `seekRange()`
   * reports the manifest's real, moving DVR window — critical for MPEG-DASH
   * live sources, which don't start their seekable range at zero the way
   * VOD does.
   */
  seekTo(time: number): void {
    const video = this.videoRef()?.nativeElement;
    if (!video || Number.isNaN(time)) return;

    const range = this.player.getSeekRange();
    if (range) {
      video.currentTime = clampSeekTarget(time, range);
      return;
    }
    const max = Number.isFinite(video.duration) ? video.duration : time;
    video.currentTime = Math.min(Math.max(0, time), max);
  }

  seekBy(deltaSeconds: number): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    this.seekTo(video.currentTime + deltaSeconds);
  }

  setVolume(value: number): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    video.volume = Math.min(1, Math.max(0, value));
    if (video.volume > 0 && video.muted) video.muted = false;
  }

  toggleMute(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) video.muted = !video.muted;
  }

  setPlaybackRate(rate: number): void {
    const video = this.videoRef()?.nativeElement;
    if (video && Number.isFinite(rate) && rate > 0) video.playbackRate = rate;
  }
}
