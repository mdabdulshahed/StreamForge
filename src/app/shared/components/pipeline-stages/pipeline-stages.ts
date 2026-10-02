import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PipelineStage {
  readonly title: string;
  readonly description: string;
}

/**
 * Renders a numbered pipeline of stages with connector arrows between them —
 * the presentational shape shared by `StreamingPipelinePanel` (the MSE
 * pipeline, Phase 8) and `DrmPipelinePanel` (the EME/DRM pipeline, Phase 9).
 * Owns no content of its own: `stages` in, numbered cards + arrows out.
 * Extracted here on its second real use rather than kept duplicated, since
 * both consumers need the exact same markup/layout, just different data.
 */
@Component({
  selector: 'sf-pipeline-stages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pipeline-stages.html',
  styleUrl: './pipeline-stages.scss',
})
export class PipelineStages {
  readonly stages = input.required<readonly PipelineStage[]>();
}
