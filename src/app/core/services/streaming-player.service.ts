import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import shaka from 'shaka-player';

import { environment } from '../../../environments/environment';
import {
  computeSimulatedDelayMs,
  detectProtocol,
  resolveDrmServers,
  type BufferedRange,
  type CaptionTrack,
  type PlayerErrorInfo,
  type QualityTrack,
  type StreamProtocol,
} from '../models';
import { qualityLabel } from '../models/quality-track.model';
import { NetworkSimulationService } from './network-simulation.service';

/** A `shaka.Player` 'error' event's payload is a `shaka.util.Error`. */
interface ShakaErrorEvent extends Event {
  readonly detail: shaka.util.Error;
}

let polyfillsInstalled = false;

/** Runs Shaka's browser polyfills exactly once, however many players exist. */
function ensurePolyfillsInstalled(): void {
  if (polyfillsInstalled) return;
  shaka.polyfill.installAll();
  polyfillsInstalled = true;
}

/**
 * The single place Shaka Player-specific code is allowed to live.
 *
 * Provided at `VideoSurface`'s component level (like `MediaEventsService`) —
 * a Shaka `Player` instance is bound to one `<video>` element, so this is
 * one-per-surface, not a singleton. Angular runs `ngOnDestroy` (which calls
 * `destroy()`) automatically when that component is torn down.
 *
 * Deliberately **not** responsible for play/pause/seek/volume/playback rate:
 * Shaka does not intercept those — it only manages *what* the `<video>`
 * element is fed via MSE, not transport control — so `VideoSurface` keeps
 * driving them directly against the native element exactly as it did before
 * Shaka existed. Duplicating pass-through methods here would just be an
 * extra hop to the same native call.
 */
@Injectable()
export class StreamingPlayerService implements OnDestroy {
  private player: shaka.Player | null = null;
  private readonly networkSim = inject(NetworkSimulationService);

  readonly isAttached = signal(false);
  readonly manifestUrl = signal<string | null>(null);
  readonly protocol = signal<StreamProtocol | null>(null);
  readonly isLive = signal(false);
  readonly loading = signal(false);
  readonly tracks = signal<readonly QualityTrack[]>([]);
  readonly activeTrack = signal<QualityTrack | null>(null);
  readonly abrEnabled = signal(true);
  readonly captionTracks = signal<readonly CaptionTrack[]>([]);
  readonly activeCaptionTrack = signal<CaptionTrack | null>(null);
  readonly error = signal<PlayerErrorInfo | null>(null);
  /**
   * Whether `environment.drm.servers` was actually applied to this player
   * instance — true only when `environment.drm.enabled` *and* at least one
   * key system has a non-empty server URL configured. Distinct from
   * `environment.drm.enabled` alone: the switch can be on with nothing
   * configured behind it (the shipped default has both).
   */
  readonly drmConfigured = signal(false);

  async attach(video: HTMLVideoElement): Promise<void> {
    ensurePolyfillsInstalled();

    if (!shaka.Player.isBrowserSupported()) {
      this.error.set({
        code: 0,
        category: 'PLAYER',
        severity: 'CRITICAL',
        message:
          'This browser is missing features Shaka Player requires (Media Source Extensions). Playback is not possible here.',
        timestamp: Date.now(),
      });
      return;
    }

    const player = new shaka.Player();
    this.player = player;
    player.addEventListener('error', (event: Event) =>
      this.handleError((event as ShakaErrorEvent).detail),
    );
    player.addEventListener('trackschanged', () => this.refreshTracks());
    player.addEventListener('adaptation', () => this.refreshTracks());

    this.configureDrm(player);
    this.registerNetworkSimulation(player);

    await player.attach(video);
    this.isAttached.set(true);
  }

  /**
   * Delays real segment responses to simulate degraded network conditions
   * (spec's network simulation panel), driven by `NetworkSimulationService`
   * — off by default, and reads `networkSim.config()` fresh on every
   * response, so changing the preset there takes effect on the very next
   * segment without needing to re-register anything here.
   *
   * Only `SEGMENT` requests are delayed, not manifests/licenses/etc. —
   * that's what actually feeds Shaka's own bandwidth estimator and ABR
   * decisions, which is the whole point: this simulates a real network
   * condition Shaka genuinely reacts to, not a synthetic number displayed
   * alongside playback that plays no real role in it. Cached responses are
   * left alone — there's no real network activity to simulate degrading.
   */
  private registerNetworkSimulation(player: shaka.Player): void {
    const networkingEngine = player.getNetworkingEngine();
    if (!networkingEngine) return;

    networkingEngine.registerResponseFilter((type, response) => {
      if (type !== shaka.net.NetworkingEngine.RequestType.SEGMENT || response.fromCache) return;

      const delayMs = computeSimulatedDelayMs(this.networkSim.config(), response.data.byteLength);
      if (delayMs <= 0) return;

      return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    });
  }

  /**
   * Applies `environment.drm.servers` to this player instance — or does
   * nothing when `resolveDrmServers` finds nothing to apply, which is the
   * shipped default (`enabled: false`). No catalog title is currently
   * encrypted, so `player.load()` never actually negotiates a key system
   * either way; this only changes what Shaka is *configured* to do if it
   * ever encountered protected content.
   */
  private configureDrm(player: shaka.Player): void {
    const servers = resolveDrmServers(environment.drm);
    if (!servers) return;

    player.configure('drm.servers', servers);
    this.drmConfigured.set(true);
  }

  async load(manifestUrl: string): Promise<void> {
    const player = this.player;
    if (!player) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await player.load(manifestUrl);
      this.manifestUrl.set(manifestUrl);
      this.protocol.set(detectProtocol(manifestUrl));
      this.isLive.set(player.isLive());
      this.refreshTracks();
      this.refreshCaptionTracks();
    } catch (err) {
      this.handleError(err as shaka.util.Error);
    } finally {
      this.loading.set(false);
    }
  }

  async unload(): Promise<void> {
    await this.player?.unload();
    this.manifestUrl.set(null);
    this.protocol.set(null);
    this.isLive.set(false);
    this.tracks.set([]);
    this.activeTrack.set(null);
    this.captionTracks.set([]);
    this.activeCaptionTrack.set(null);
  }

  async destroy(): Promise<void> {
    await this.player?.destroy();
    this.player = null;
    this.isAttached.set(false);
  }

  ngOnDestroy(): void {
    void this.destroy();
  }

  /** Snapshot of how much of the timeline is currently buffered. */
  getBufferedInfo(): shaka.extern.BufferedInfo | null {
    return this.player?.getBufferedInfo() ?? null;
  }

  /**
   * Shaka's own playback statistics — bandwidth estimate, decoded/dropped
   * frame counts, and more. A snapshot, not a signal: Shaka has no change
   * event for these (confirmed by grepping the shipped `.d.ts` — there is
   * no `bandwidthestimatechanged` or similar), so this is meant to be
   * polled by whatever displays it (`DiagnosticsDashboard`), not read once.
   */
  getStats(): shaka.extern.Stats | null {
    return this.player?.getStats() ?? null;
  }

  /**
   * Shaka's own record of the active DRM key system for whatever is
   * currently loaded — `null` whenever the content isn't encrypted, which
   * is every catalog title today. A snapshot, same as `getStats()`, meant
   * to be polled by `DiagnosticsDashboard` after `load()` rather than read
   * once.
   */
  getDrmInfo(): shaka.extern.DrmInfo | null {
    return this.player?.drmInfo() ?? null;
  }

  /**
   * The range of time seeking is actually allowed to reach right now.
   *
   * For VOD this is `[0, duration]`. For a live presentation with a rolling
   * DVR window — MPEG-DASH live's defining trait, see `orbit-24` in the
   * catalog — `start` slides forward as the manifest's availability window
   * moves, so this is the one source of truth `VideoSurface.seekTo` needs
   * to clamp against instead of the native element's `duration` (which is
   * unreliable — often `Infinity` — for live content).
   */
  getSeekRange(): BufferedRange | null {
    return this.player?.seekRange() ?? null;
  }

  /**
   * Manually pins playback to one rendition, disabling ABR. Mirrors spec
   * section 15: manual selection turns automatic adaptation off.
   */
  selectTrack(track: QualityTrack): void {
    const player = this.player;
    if (!player) return;
    const shakaTrack = player.getVariantTracks().find((t: shaka.extern.Track) => t.id === track.id);
    if (!shakaTrack) return;

    player.configure('abr.enabled', false);
    this.abrEnabled.set(false);
    player.selectVariantTrack(shakaTrack, true);
    this.refreshTracks();
  }

  /** Re-enables ABR after a manual `selectTrack` call. */
  enableAbr(): void {
    this.player?.configure('abr.enabled', true);
    this.abrEnabled.set(true);
  }

  /**
   * Selects a caption/subtitle track, or `null` to turn captions off. Shaka
   * has no separate visibility toggle in this version — selecting a track
   * is what shows it, and `selectTextTrack(null)` is what hides it.
   */
  selectCaptionTrack(track: CaptionTrack | null): void {
    const player = this.player;
    if (!player) return;

    if (track === null) {
      player.selectTextTrack(null);
      this.activeCaptionTrack.set(null);
      return;
    }

    const shakaTrack = player.getTextTracks().find((t: shaka.extern.TextTrack) => t.id === track.id);
    if (!shakaTrack) return;
    player.selectTextTrack(shakaTrack);
    this.activeCaptionTrack.set(track);
  }

  private refreshTracks(): void {
    const player = this.player;
    if (!player) return;

    const tracks = player.getVariantTracks().map(toQualityTrack);
    this.tracks.set(tracks);
    this.activeTrack.set(tracks.find((t) => t.active) ?? null);
  }

  /**
   * Text tracks are static per manifest — unlike variant tracks, ABR never
   * switches between them — so this only needs to run once after `load()`,
   * not on an ongoing event like `refreshTracks` does.
   */
  private refreshCaptionTracks(): void {
    const player = this.player;
    if (!player) return;

    const tracks = player.getTextTracks().map(toCaptionTrack);
    this.captionTracks.set(tracks);
    this.activeCaptionTrack.set(tracks.find((t) => t.active) ?? null);
  }

  private handleError(shakaError: shaka.util.Error): void {
    this.error.set({
      code: shakaError.code,
      category: shaka.util.Error.Category[shakaError.category] ?? 'UNKNOWN',
      severity:
        (shaka.util.Error.Severity[shakaError.severity] as 'RECOVERABLE' | 'CRITICAL' | undefined) ??
        'UNKNOWN',
      message: shakaError.message,
      timestamp: Date.now(),
    });
  }
}

function toQualityTrack(track: shaka.extern.Track): QualityTrack {
  return {
    id: track.id,
    active: track.active,
    height: track.height,
    width: track.width,
    bandwidth: track.bandwidth,
    frameRate: track.frameRate,
    videoCodec: track.videoCodec,
    label: qualityLabel(track.height),
  };
}

function toCaptionTrack(track: shaka.extern.TextTrack): CaptionTrack {
  return {
    id: track.id,
    active: track.active,
    language: track.language,
    label: track.label,
    kind: track.kind,
  };
}
