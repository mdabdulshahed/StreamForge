import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PipelineStage, PipelineStages } from '../pipeline-stages/pipeline-stages';

const STAGES: readonly PipelineStage[] = [
  {
    title: 'Manifest',
    description:
      'A .m3u8 (HLS) or .mpd (MPEG-DASH) file listing the available renditions and where their segments live. Shaka parses either into one common internal format.',
  },
  {
    title: 'Segments',
    description:
      'Each rendition is split into short, independently-fetched chunks — typically 2–10 seconds. Fetching them one at a time, and choosing a different rendition for the next one, is what makes mid-stream quality switching possible.',
  },
  {
    title: 'MSE',
    description:
      'Media Source Extensions: the browser API that lets JavaScript feed a video element a programmatic stream instead of one fixed file. Shaka uses it to append fetched segments as they arrive.',
  },
  {
    title: 'MediaSource',
    description:
      'An object representing that programmatic stream. video.src is set to a blob: URL pointing at it — the manifest URL itself is never assigned to the element directly.',
  },
  {
    title: 'SourceBuffer',
    description:
      "One or more per-track buffers (video, audio, sometimes text) inside the MediaSource. Shaka appends each fetched segment's raw bytes into the matching buffer via appendBuffer().",
  },
  {
    title: 'HTMLVideoElement',
    description:
      'Plays whatever the SourceBuffers contain. It has no idea a manifest, segments, or a streaming protocol were ever involved — from its perspective, media data just keeps arriving.',
  },
];

/**
 * Static explanatory panel — spec section 10's "How streaming works".
 *
 * Purely documentation: nothing here executes any part of the pipeline it
 * describes. Shaka Player (via `StreamingPlayerService`, since Phase 3) is
 * what actually does this work; this panel exists so the mechanism isn't a
 * black box to anyone reading the diagnostics page.
 */
@Component({
  selector: 'sf-streaming-pipeline-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PipelineStages],
  templateUrl: './streaming-pipeline-panel.html',
  styleUrl: './streaming-pipeline-panel.scss',
})
export class StreamingPipelinePanel {
  protected readonly stages = STAGES;
}
