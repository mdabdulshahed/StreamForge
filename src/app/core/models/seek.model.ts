import type { BufferedRange } from './media-event.model';

/**
 * Clamps a requested seek target to the range playback is actually allowed
 * to reach right now.
 *
 * For VOD this is `[0, duration]` and behaves like a plain clamp. It matters
 * more for a **live** presentation with a rolling DVR window — the case
 * MPEG-DASH live introduces (see `orbit-24`/`meridian-live` in the
 * catalog): `range.start` is *not* zero, it slides forward as older
 * segments fall out of the manifest's availability window, so naively
 * clamping to `[0, duration]` would let a user "seek" to content that no
 * longer exists and stall. Shaka reports the real window via
 * `player.seekRange()`.
 */
export function clampSeekTarget(target: number, range: BufferedRange): number {
  if (Number.isNaN(target)) return range.start;
  return Math.min(Math.max(target, range.start), range.end);
}
