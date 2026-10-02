/**
 * A playback error, normalised into one shape the UI can render regardless
 * of which layer reported it (Shaka Player's manifest/streaming pipeline vs.
 * the native `HTMLMediaElement`).
 *
 * `code`/`category`/`severity` are taken directly from Shaka's own
 * `shaka.util.Error` when available — never invented — which is what lets
 * diagnostics (Phase 7) show a real error code instead of a guess.
 */
export interface PlayerErrorInfo {
  readonly code: number;
  readonly category: string;
  readonly severity: 'RECOVERABLE' | 'CRITICAL' | 'UNKNOWN';
  readonly message: string;
  readonly timestamp: number;
}
