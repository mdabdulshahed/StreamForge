import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type { BufferedRange, CaptionTrack, PlaybackState, QualityTrack } from '../../../../core/models';
import { distinctQualityLevels } from '../../../../core/models/quality-track.model';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { formatClock } from '../../../../shared/utils/format';

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Presentational playback control bar.
 *
 * Holds no reference to the `<video>` element and no player logic — every
 * action is emitted as an output and applied by the caller through
 * `VideoSurface`'s imperative API. That keeps this component reusable and
 * trivially testable in isolation.
 */
@Component({
  selector: 'sf-control-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DurationPipe],
  templateUrl: './control-bar.html',
  styleUrl: './control-bar.scss',
})
export class ControlBar {
  readonly state = input.required<PlaybackState>();
  readonly currentTime = input.required<number>();
  readonly duration = input.required<number>();
  readonly buffered = input.required<readonly BufferedRange[]>();
  readonly volume = input.required<number>();
  readonly muted = input.required<boolean>();
  readonly playbackRate = input.required<number>();
  readonly isFullscreen = input.required<boolean>();
  readonly title = input.required<string>();
  readonly captionTracks = input.required<readonly CaptionTrack[]>();
  readonly activeCaptionTrack = input.required<CaptionTrack | null>();
  readonly qualityTracks = input.required<readonly QualityTrack[]>();
  readonly activeQualityTrack = input.required<QualityTrack | null>();
  readonly abrEnabled = input.required<boolean>();

  readonly playPauseToggle = output<void>();
  readonly seek = output<number>();
  readonly volumeChange = output<number>();
  readonly muteToggle = output<void>();
  readonly rateChange = output<number>();
  readonly fullscreenToggle = output<void>();
  readonly captionToggle = output<void>();
  /** `null` selects Auto (re-enables ABR); a track pins that resolution. */
  readonly selectQuality = output<QualityTrack | null>();

  protected readonly rateOptions = RATE_OPTIONS;

  protected readonly isPlaying = computed(() => this.state() === 'playing');
  protected readonly isBuffering = computed(
    () => this.state() === 'buffering' || this.state() === 'seeking',
  );

  private readonly bufferedEnd = computed(() =>
    this.buffered().reduce((max, r) => Math.max(max, r.end), 0),
  );

  protected readonly playedPercent = computed(() => this.percentOf(this.currentTime()));
  protected readonly bufferedPercent = computed(() => this.percentOf(this.bufferedEnd()));

  /**
   * Three-stop gradient painted directly onto the range input: played,
   * buffered-but-unplayed, and not-yet-buffered. Cheaper and simpler than
   * layering separate divs behind a transparent input, and keeps the
   * pointer target and the visual in the same element.
   */
  protected readonly trackBackground = computed(() => {
    const played = this.playedPercent();
    const buffered = Math.max(played, this.bufferedPercent());
    return (
      `linear-gradient(to right, ` +
      `var(--color-ember-500) 0%, var(--color-ember-500) ${played}%, ` +
      `rgba(255,255,255,.4) ${played}%, rgba(255,255,255,.4) ${buffered}%, ` +
      `rgba(255,255,255,.22) ${buffered}%, rgba(255,255,255,.22) 100%)`
    );
  });

  protected readonly volumeIcon = computed<'muted' | 'low' | 'high'>(() => {
    if (this.muted() || this.volume() === 0) return 'muted';
    return this.volume() < 0.5 ? 'low' : 'high';
  });

  protected readonly seekAriaLabel = computed(
    () => `Seek. Current position ${formatClock(this.currentTime())} of ${formatClock(this.duration())}`,
  );

  protected readonly hasCaptions = computed(() => this.captionTracks().length > 0);
  protected readonly captionsOn = computed(() => this.activeCaptionTrack() !== null);
  protected readonly captionsLabel = computed(() => {
    if (!this.hasCaptions()) return 'This stream has no caption track';
    return this.captionsOn() ? 'Turn off captions' : 'Turn on captions';
  });

  protected readonly qualityMenuOpen = signal(false);
  protected readonly qualityOptions = computed(() => distinctQualityLevels(this.qualityTracks()));

  protected readonly autoOptionLabel = computed(() => {
    const active = this.activeQualityTrack();
    return active ? `Auto · ${active.label}` : 'Auto';
  });

  protected readonly qualityButtonLabel = computed(() => {
    if (this.qualityOptions().length === 0) return 'Quality (no rendition ladder available)';
    return `Quality. Currently ${this.abrEnabled() ? this.autoOptionLabel() : (this.activeQualityTrack()?.label ?? 'unknown')}`;
  });

  protected isQualitySelected(track: QualityTrack): boolean {
    if (this.abrEnabled()) return false;
    return this.activeQualityTrack()?.height === track.height;
  }

  protected toggleQualityMenu(): void {
    this.qualityMenuOpen.update((open) => !open);
  }

  protected chooseAuto(): void {
    this.selectQuality.emit(null);
    this.qualityMenuOpen.set(false);
  }

  protected chooseQuality(track: QualityTrack): void {
    this.selectQuality.emit(track);
    this.qualityMenuOpen.set(false);
  }

  private percentOf(value: number): number {
    const total = this.duration();
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
  }

  protected onScrub(event: Event): void {
    this.seek.emit(Number((event.target as HTMLInputElement).value));
  }

  protected onVolumeInput(event: Event): void {
    this.volumeChange.emit(Number((event.target as HTMLInputElement).value));
  }

  protected onRateChange(event: Event): void {
    this.rateChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
