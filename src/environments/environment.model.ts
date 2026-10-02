/**
 * Shape of the build-time environment.
 *
 * Kept in its own file so `environment.ts` and `environment.production.ts`
 * are structurally checked against the same contract — a missing key in one
 * of them becomes a compile error rather than an `undefined` at runtime.
 */

/** Key system identifiers recognised by the EME `requestMediaKeySystemAccess` API. */
export const KEY_SYSTEM = {
  widevine: 'com.widevine.alpha',
  playready: 'com.microsoft.playready',
  fairplay: 'com.apple.fps',
} as const;

export type KeySystemId = (typeof KEY_SYSTEM)[keyof typeof KEY_SYSTEM];

/**
 * DRM configuration.
 *
 * Deliberately empty by default. Nothing here is a secret: a Widevine
 * *license server URL* is a public endpoint, and the actual keys never leave
 * the CDM. Credentials (if a proxy needs them) must come from the deployment
 * environment, never from source control.
 */
export interface DrmEnvironmentConfig {
  /** Master switch. When false the player never requests a key system. */
  readonly enabled: boolean;
  /** license server URL per key system. Empty string = not configured. */
  readonly servers: Readonly<Record<KeySystemId, string>>;
}

export interface Environment {
  readonly production: boolean;
  readonly appName: string;
  /** How often diagnostics polls the player for live stats, in milliseconds. */
  readonly diagnosticsPollIntervalMs: number;
  /** Shows the network-simulation panel and other engineer-facing tooling. */
  readonly enableDeveloperTools: boolean;
  readonly drm: DrmEnvironmentConfig;
}
