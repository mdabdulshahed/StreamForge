import { Pipe, type PipeTransform } from '@angular/core';

import { formatClock } from '../utils/format';

/**
 * Formats a duration in seconds.
 *
 * `'clock'`  → `1:04:07` / `8:12`   — for player timecodes.
 * `'human'`  → `1h 4m`   / `8m`     — for catalog metadata.
 *
 * Returns `'LIVE'` for `null`, which is how the catalog represents a stream
 * with no fixed duration.
 */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number | null | undefined, style: 'clock' | 'human' = 'human'): string {
    if (seconds === null || seconds === undefined) return 'LIVE';
    if (!Number.isFinite(seconds) || seconds < 0) return style === 'clock' ? '0:00' : '—';

    if (style === 'clock') return formatClock(seconds);

    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
}
