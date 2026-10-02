import { ChangeDetectionStrategy, Component } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { PipelineStage, PipelineStages } from '../pipeline-stages/pipeline-stages';

const STAGES: readonly PipelineStage[] = [
  {
    title: 'Application',
    description:
      "Shaka Player parses the manifest and finds DRM signaling in it — a <ContentProtection> element in DASH, or an #EXT-X-KEY tag in HLS — marking some or all segments as encrypted before a single byte of media is fetched.",
  },
  {
    title: 'EME',
    description:
      'Encrypted Media Extensions: the browser API a page uses to request a decryption module for a specific key system (com.widevine.alpha here) and hand it the encrypted init data — without the page ever touching a raw key itself.',
  },
  {
    title: 'Browser DRM / CDM',
    description:
      "The browser's built-in Content Decryption Module (Widevine, on Chrome/Firefox/Edge) opens a session from that init data and builds a license request — a piece of browser-vendor-signed code the page cannot see inside of.",
  },
  {
    title: 'License server',
    description:
      "A server the content owner controls (not this app) validates the request and returns an encrypted license containing the real decryption keys. Shaka's role is only to relay this request/response — it never decrypts anything itself.",
  },
  {
    title: 'Decryption',
    description:
      'The CDM decrypts each segment internally, isolated from page JavaScript and, on supporting hardware, inside a secure enclave the operating system itself cannot inspect.',
  },
  {
    title: 'Playback',
    description:
      "Decrypted frames reach the video element exactly like unencrypted MSE playback (the Phase 8 pipeline). From HTMLVideoElement's perspective, nothing about this path looked any different.",
  },
];

/**
 * Static explanatory panel — spec section 11's DRM/EME pipeline diagram,
 * the sibling of `StreamingPipelinePanel`'s MSE pipeline from Phase 8. Same
 * rule applies: purely documentation, nothing here executes any part of
 * what it describes.
 *
 * Unlike the MSE pipeline, this one is never actually exercised by this
 * app — no catalog title is encrypted, and `environment.drm.enabled` is
 * `false` by default (see Phase 10 for why that stays true for now). The
 * panel says so plainly rather than implying a capability that isn't real.
 */
@Component({
  selector: 'sf-drm-pipeline-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PipelineStages],
  templateUrl: './drm-pipeline-panel.html',
  styleUrl: './drm-pipeline-panel.scss',
})
export class DrmPipelinePanel {
  protected readonly stages = STAGES;
  protected readonly drmEnabled = environment.drm.enabled;
}
