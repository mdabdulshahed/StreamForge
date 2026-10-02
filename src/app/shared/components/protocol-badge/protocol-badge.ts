import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PROTOCOL_LABEL, type StreamProtocol } from '../../../core/models';

/**
 * Small pill showing which streaming protocol backs a title.
 *
 * Surfacing the protocol in the catalog (rather than only in diagnostics) is a
 * deliberate product choice for this app: the delivery format *is* the subject
 * matter here, not an implementation detail to hide.
 */
@Component({
  selector: 'sf-protocol-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider ring-1 ring-inset',
    '[class]': 'tone()',
  },
  template: `{{ label() }}`,
})
export class ProtocolBadge {
  readonly protocol = input.required<StreamProtocol>();

  protected readonly label = computed(() => PROTOCOL_LABEL[this.protocol()]);

  protected readonly tone = computed(() =>
    this.protocol() === 'dash'
      ? 'bg-violet-500/15 text-violet-400 ring-violet-500/30'
      : 'bg-ok-400/15 text-ok-400 ring-ok-400/30',
  );
}
