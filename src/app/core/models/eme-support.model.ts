import { KEY_SYSTEM } from '../../../environments/environment.model';

/**
 * Encrypted Media Extensions capability detection (spec section 11).
 *
 * Unlike `detectMseSupport()`, this cannot be a synchronous existence
 * check: `navigator.requestMediaKeySystemAccess` exists in every modern
 * browser regardless of whether any key system is actually usable — the
 * only way to know is to ask it to negotiate one and see whether the
 * returned promise resolves or rejects. `available` and `widevine` are
 * therefore two different facts: a browser can have the EME *API* without
 * the Widevine CDM behind it (e.g. some Linux Chromium builds, or EME
 * disabled in browser settings).
 */
export interface EmeSupport {
  /** Whether `navigator.requestMediaKeySystemAccess` exists at all. */
  readonly available: boolean;
  /** Whether a `com.widevine.alpha` key system was actually negotiated. */
  readonly widevine: boolean;
}

/**
 * A minimal, standards-valid configuration for probing key system support.
 * Content type and init data type only — no real content is ever loaded or
 * decrypted by this check, it only asks the browser "could you play
 * something shaped like this, if it were encrypted?"
 */
const WIDEVINE_PROBE_CONFIG: MediaKeySystemConfiguration[] = [
  {
    initDataTypes: ['cenc'],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
  },
];

export async function detectEmeSupport(): Promise<EmeSupport> {
  if (typeof navigator.requestMediaKeySystemAccess !== 'function') {
    return { available: false, widevine: false };
  }

  try {
    await navigator.requestMediaKeySystemAccess(KEY_SYSTEM.widevine, WIDEVINE_PROBE_CONFIG);
    return { available: true, widevine: true };
  } catch {
    return { available: true, widevine: false };
  }
}
