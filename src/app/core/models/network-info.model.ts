/**
 * The `navigator.connection` (Network Information API) fields the
 * diagnostics dashboard shows. Not part of the DOM standard lib types —
 * it's a Chromium-only experimental API, unsupported in Safari and Firefox
 * — so it's read defensively and the caller decides how to label "not
 * reported by this browser" versus an actual measurement.
 */
export interface NetworkInfo {
  readonly effectiveType: string | null;
  readonly rttMs: number | null;
}

interface NavigatorConnection {
  readonly effectiveType?: string;
  readonly rtt?: number;
}

/** `null` when the browser doesn't implement the API at all. */
export function readNetworkInfo(): NetworkInfo | null {
  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  if (!connection) return null;

  return {
    effectiveType: connection.effectiveType ?? null,
    rttMs: typeof connection.rtt === 'number' ? connection.rtt : null,
  };
}
