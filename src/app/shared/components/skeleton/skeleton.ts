import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shimmering placeholder block.
 *
 * Marked `aria-hidden` and paired with a live-region status message by the
 * consuming page — announcing a wall of empty boxes to a screen reader is
 * noise, whereas "Loading catalog" is useful.
 */
@Component({
  selector: 'sf-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sf-skeleton block',
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
  template: '',
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input('0.5rem');
}
