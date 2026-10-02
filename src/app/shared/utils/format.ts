/**
 * Formats seconds as a player timecode: `1:04:07` once past an hour,
 * `8:12` otherwise. Shared by `DurationPipe` (template use) and anywhere
 * that needs the plain string outside a template — an `aria-label`
 * computed in a component, for instance — where instantiating a pipe for
 * one call would be an odd fit.
 */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

/** Bits per second → one-decimal Mbps string, e.g. `5.8`. */
export function formatMbps(bitsPerSecond: number): string {
  return (bitsPerSecond / 1_000_000).toFixed(1);
}
