import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  bufferAheadSeconds,
  detectDisplayCapabilities,
  detectEmeSupport,
  detectMseSupport,
  readNetworkInfo,
  type EmeSupport,
  type NetworkInfo,
} from '../../../core/models';
import type { PlaybackSession } from '../../../core/services/playback-session-registry.service';
import { formatClock, formatMbps } from '../../utils/format';

interface StatRow {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}

interface StatSection {
  readonly heading: string;
  readonly rows: readonly StatRow[];
}

const EM_DASH = '—';
const NOT_REPORTED = 'Not reported by this browser';

/**
 * The technical dashboard content (spec section 17), as a standalone
 * component rather than baked into the `/diagnostics` route — it's also
 * embedded directly in `/player/:id` as a live panel, since navigating to
 * `/diagnostics` tears down the active player (see
 * `PlaybackSessionRegistry`'s doc comment for why) and a diagnostics
 * dashboard you can only reach by ending playback is of limited use.
 *
 * Everything here is either read reactively from the session's existing
 * signals, sampled on an interval from Shaka's snapshot-only APIs
 * (`getStats()`, `getBufferedInfo()`, `getDrmInfo()`), or a one-time
 * browser capability check (MSE, EME, Fullscreen, Picture-in-Picture) —
 * nothing is estimated or invented. The "Browser APIs" section reports
 * *capability* (can the browser do DRM at all) and is the one part of this
 * dashboard that renders even with no active session; the "DRM" section
 * reports *configuration* (is this app set up to use it, and is a key
 * system actually active for whatever's loaded right now) and is
 * necessarily session-gated, since `drmConfigured`/`getDrmInfo()` live on a
 * real player instance.
 */
@Component({
  selector: 'sf-diagnostics-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnostics-dashboard.html',
  styleUrl: './diagnostics-dashboard.scss',
})
export class DiagnosticsDashboard {
  readonly session = input.required<PlaybackSession | null>();

  private readonly estimatedBandwidthMbps = signal<number | null>(null);
  private readonly droppedFrames = signal<number | null>(null);
  private readonly decodedFrames = signal<number | null>(null);
  private readonly bufferAhead = signal<number | null>(null);
  private readonly networkInfo = signal<NetworkInfo | null>(null);
  private readonly activeDrmKeySystem = signal<string | null>(null);
  private readonly activeDrmLicenseServer = signal<string | null>(null);

  protected readonly errorInfo = computed(() => this.session()?.player.error() ?? null);

  /**
   * Browser capabilities, not session data — true regardless of whether
   * anything is currently playing, so (unlike the sections below) this
   * doesn't wait for a `session()` to exist. MSE, Fullscreen and
   * Picture-in-Picture are synchronous checks, detected once up front. EME
   * is different: `detectEmeSupport()` is async (it has to actually
   * negotiate a key system to know the answer — see its doc comment), so
   * it starts as `null` and resolves once, kicked off from the
   * constructor below.
   */
  private readonly mseSupport = detectMseSupport();
  private readonly displayCapabilities = detectDisplayCapabilities();
  private readonly emeSupport = signal<EmeSupport | null>(null);

  protected readonly browserApiSection = computed<StatSection>(() => {
    const eme = this.emeSupport();
    return {
      heading: 'Browser APIs',
      rows: [
        {
          label: 'Media Source Extensions',
          value: this.mseSupport.mediaSource ? 'Supported' : 'Not supported',
        },
        {
          label: 'ManagedMediaSource (Safari/iOS)',
          value: this.mseSupport.managedMediaSource ? 'Supported' : 'Not supported',
        },
        {
          label: 'Encrypted Media Extensions',
          value: eme === null ? 'Checking…' : eme.available ? 'Supported' : 'Not supported',
        },
        {
          label: 'Widevine (com.widevine.alpha)',
          value: eme === null ? 'Checking…' : eme.widevine ? 'Supported' : 'Not supported',
        },
        {
          label: 'Fullscreen',
          value: this.displayCapabilities.fullscreen ? 'Supported' : 'Not supported',
        },
        {
          label: 'Picture-in-Picture',
          value: this.displayCapabilities.pictureInPicture ? 'Supported' : 'Not supported',
        },
      ],
    };
  });

  protected readonly sections = computed<readonly StatSection[]>(() => {
    const session = this.session();
    if (!session) return [this.browserApiSection()];

    const track = session.player.activeTrack();
    const metrics = session.analytics.metrics();
    const net = this.networkInfo();
    const bandwidth = this.estimatedBandwidthMbps();
    const buffer = this.bufferAhead();
    const dropped = this.droppedFrames();
    const decoded = this.decodedFrames();

    return [
      this.browserApiSection(),
      {
        heading: 'Playback',
        rows: [
          { label: 'State', value: session.events.state().toUpperCase() },
          { label: 'Protocol', value: session.player.protocol() ?? EM_DASH },
          { label: 'Resolution', value: track?.label ?? EM_DASH },
          { label: 'Bitrate', value: track ? `${formatMbps(track.bandwidth)} Mbps` : EM_DASH },
          { label: 'Buffer', value: buffer !== null ? `${buffer.toFixed(1)} sec` : EM_DASH },
          { label: 'Playback rate', value: `${session.events.playbackRate()}×` },
          {
            label: 'Media time',
            value: `${formatClock(session.events.currentTime())} / ${formatClock(session.events.duration())}`,
          },
          { label: 'Live', value: session.player.isLive() ? 'Yes' : 'No' },
        ],
      },
      {
        heading: 'Network',
        rows: [
          {
            label: 'Estimated bandwidth',
            value: bandwidth !== null ? `${bandwidth.toFixed(1)} Mbps` : EM_DASH,
          },
          { label: 'Network type', value: net?.effectiveType ?? NOT_REPORTED },
          { label: 'RTT', value: net?.rttMs !== null && net?.rttMs !== undefined ? `${net.rttMs} ms` : NOT_REPORTED },
        ],
      },
      {
        heading: 'Performance',
        rows: [
          {
            label: 'Manifest load time',
            value:
              metrics.manifestLoadTimeMs !== null
                ? `${(metrics.manifestLoadTimeMs / 1000).toFixed(2)} sec`
                : EM_DASH,
          },
          {
            label: 'Startup time',
            value:
              metrics.startupTimeMs !== null ? `${(metrics.startupTimeMs / 1000).toFixed(2)} sec` : EM_DASH,
          },
          { label: 'Rebuffers', value: `${metrics.rebufferCount}` },
          {
            label: 'Total rebuffer duration',
            value: `${(metrics.totalRebufferDurationMs / 1000).toFixed(1)} sec`,
          },
          { label: 'Quality switches', value: `${metrics.qualitySwitches}` },
          { label: 'Dropped frames', value: dropped !== null ? `${dropped}` : EM_DASH },
          { label: 'Decoded frames', value: decoded !== null ? `${decoded}` : EM_DASH },
          { label: 'Seeks', value: `${metrics.seekCount}` },
          { label: 'Pauses / resumes', value: `${metrics.pauseCount} / ${metrics.resumeCount}` },
          { label: 'Completed', value: metrics.completed ? 'Yes' : 'No' },
        ],
      },
      {
        heading: 'DRM',
        rows: [
          {
            label: 'Configuration',
            value: environment.drm.enabled ? 'Enabled' : 'Disabled (default)',
          },
          { label: 'Servers configured', value: session.player.drmConfigured() ? 'Yes' : 'No' },
          { label: 'Active key system', value: this.activeDrmKeySystem() ?? EM_DASH },
          { label: 'License server', value: this.activeDrmLicenseServer() ?? EM_DASH, mono: true },
        ],
      },
      {
        heading: 'Stream',
        rows: [
          { label: 'Title', value: session.assetTitle },
          { label: 'Manifest', value: session.player.manifestUrl() ?? EM_DASH, mono: true },
        ],
      },
    ];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    void detectEmeSupport().then((support) => this.emeSupport.set(support));

    effect(() => {
      const session = this.session();
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (!session) {
        this.estimatedBandwidthMbps.set(null);
        this.droppedFrames.set(null);
        this.decodedFrames.set(null);
        this.bufferAhead.set(null);
        this.activeDrmKeySystem.set(null);
        this.activeDrmLicenseServer.set(null);
        return;
      }

      this.poll(session);
      intervalId = setInterval(() => this.poll(session), environment.diagnosticsPollIntervalMs);
    });

    destroyRef.onDestroy(() => {
      if (intervalId !== null) clearInterval(intervalId);
    });
  }

  private poll(session: PlaybackSession): void {
    const stats = session.player.getStats();
    this.estimatedBandwidthMbps.set(stats ? stats.estimatedBandwidth / 1_000_000 : null);
    this.droppedFrames.set(stats?.droppedFrames ?? null);
    this.decodedFrames.set(stats?.decodedFrames ?? null);

    const buffered = session.player.getBufferedInfo();
    this.bufferAhead.set(buffered ? bufferAheadSeconds(buffered.total, session.events.currentTime()) : null);

    const drmInfo = session.player.getDrmInfo();
    this.activeDrmKeySystem.set(drmInfo?.keySystem ?? null);
    this.activeDrmLicenseServer.set(drmInfo?.licenseServerUri ?? null);

    this.networkInfo.set(readNetworkInfo());
  }
}
