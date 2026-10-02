import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import type { QualityTrack, VideoAsset } from '../../core/models';
import { NetworkSimulationService } from '../../core/services/network-simulation.service';
import { PlaybackSessionRegistry, type PlaybackSession } from '../../core/services/playback-session-registry.service';
import { DiagnosticsDashboard } from '../../shared/components/diagnostics-dashboard/diagnostics-dashboard';
import { ProtocolBadge } from '../../shared/components/protocol-badge/protocol-badge';
import { formatMbps } from '../../shared/utils/format';
import { ControlBar } from './components/control-bar/control-bar';
import { NetworkSimulationPanel } from './components/network-simulation-panel/network-simulation-panel';
import { VideoSurface } from './components/video-surface/video-surface';

const AUTO_HIDE_DELAY_MS = 2600;

/**
 * Playback route.
 *
 * Loads the title's real manifest (`.m3u8`/`.mpd`) through
 * `StreamingPlayerService`, which Phase 2's `VideoSurface`/`ControlBar` pair
 * needed zero changes to accommodate — they only ever spoke to the native
 * `<video>` element's transport controls, never to a fixed `src`.
 */
@Component({
  selector: 'sf-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VideoSurface, ControlBar, ProtocolBadge, DiagnosticsDashboard, NetworkSimulationPanel],
  templateUrl: './player-page.html',
  styleUrl: './player-page.scss',
})
export default class PlayerPage {
  readonly asset = input.required<VideoAsset>();

  protected readonly controlsVisible = signal(true);
  protected readonly isFullscreen = signal(false);
  protected readonly diagnosticsPanelOpen = signal(false);
  protected readonly networkPanelOpen = signal(false);
  protected readonly formatMbps = formatMbps;
  protected readonly showDeveloperTools = environment.enableDeveloperTools;

  private readonly networkSim = inject(NetworkSimulationService);
  protected readonly networkSimConfig = this.networkSim.config;

  protected readonly surface = viewChild.required(VideoSurface);
  private readonly shell = viewChild.required<ElementRef<HTMLElement>>('shell');

  /** Bundles this surface's live services for `PlaybackSessionRegistry` and the in-page diagnostics panel. */
  protected readonly session = computed<PlaybackSession>(() => {
    const s = this.surface();
    const a = this.asset();
    return {
      assetId: a.id,
      assetTitle: a.title,
      events: s.events,
      player: s.player,
      analytics: s.analytics,
    };
  });

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const registry = inject(PlaybackSessionRegistry);

    afterNextRender(() => {
      const onFullscreenChange = () =>
        this.isFullscreen.set(document.fullscreenElement === this.shell().nativeElement);
      document.addEventListener('fullscreenchange', onFullscreenChange);
      destroyRef.onDestroy(() => document.removeEventListener('fullscreenchange', onFullscreenChange));
    });

    effect(() => {
      // Controls stay lit in every state except active playback, where they
      // auto-hide after a period of no pointer/keyboard activity.
      if (this.surface().events.state() === 'playing') this.armHideTimer();
      else this.showControls();
    });

    effect(() => registry.register(this.session()));
    destroyRef.onDestroy(() => registry.clear(this.session()));

    destroyRef.onDestroy(() => this.clearHideTimer());
  }

  protected toggleDiagnosticsPanel(): void {
    this.diagnosticsPanelOpen.update((open) => !open);
  }

  protected toggleNetworkPanel(): void {
    this.networkPanelOpen.update((open) => !open);
  }

  protected notifyActivity(): void {
    this.controlsVisible.set(true);
    if (this.surface().events.state() === 'playing') this.armHideTimer();
  }

  protected onMouseLeave(): void {
    if (this.surface().events.state() === 'playing') {
      this.controlsVisible.set(false);
      this.clearHideTimer();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.tagName === 'INPUT') return;

    const surface = this.surface();
    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        surface.togglePlay();
        break;
      case 'ArrowRight':
        event.preventDefault();
        surface.seekBy(5);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        surface.seekBy(-5);
        break;
      case 'ArrowUp':
        event.preventDefault();
        surface.setVolume(surface.events.volume() + 0.05);
        break;
      case 'ArrowDown':
        event.preventDefault();
        surface.setVolume(surface.events.volume() - 0.05);
        break;
      case 'm':
        surface.toggleMute();
        break;
      case 'f':
        void this.toggleFullscreen();
        break;
      case 'c':
        this.toggleCaptions();
        break;
      default:
        return;
    }
    this.notifyActivity();
  }

  protected async toggleFullscreen(): Promise<void> {
    const el = this.shell().nativeElement;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  }

  protected toggleCaptions(): void {
    const player = this.surface().player;
    if (player.activeCaptionTrack()) {
      player.selectCaptionTrack(null);
    } else {
      const first = player.captionTracks()[0];
      if (first) player.selectCaptionTrack(first);
    }
  }

  /** `null` from `ControlBar` means "Auto" was chosen; a track pins that resolution. */
  protected selectQuality(track: QualityTrack | null): void {
    const player = this.surface().player;
    if (track === null) player.enableAbr();
    else player.selectTrack(track);
  }

  private showControls(): void {
    this.controlsVisible.set(true);
    this.clearHideTimer();
  }

  private armHideTimer(): void {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => this.controlsVisible.set(false), AUTO_HIDE_DELAY_MS);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
