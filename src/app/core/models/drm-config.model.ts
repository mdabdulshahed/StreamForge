import type { DrmEnvironmentConfig } from '../../../environments/environment.model';

/**
 * Resolves `environment.drm` down to exactly what Shaka's
 * `configure('drm.servers', ...)` needs — or `null` when there is nothing
 * to apply. Kept as a pure function (same discipline as
 * `distinctQualityLevels`/`clampSeekTarget`/`detectMseSupport`) so the one
 * piece of real logic here — "enabled" alone isn't sufficient, at least one
 * key system also needs a non-empty server URL — is unit-testable without
 * a real `shaka.Player` instance.
 */
export function resolveDrmServers(config: DrmEnvironmentConfig): Record<string, string> | null {
  if (!config.enabled) return null;

  const servers = Object.fromEntries(Object.entries(config.servers).filter(([, url]) => url.length > 0));

  return Object.keys(servers).length > 0 ? servers : null;
}
