/**
 * Configuration for artificially degrading network conditions inside the
 * app (spec's network simulation panel) — since there is no browser API to
 * throttle a real network connection from page JavaScript, this instead
 * delays real segment responses before Shaka sees them, which genuinely
 * changes what Shaka's own bandwidth estimator measures and how ABR
 * reacts. Nothing about a resulting quality drop or bandwidth reading is
 * invented; the delay is real, so its effects are real.
 */
export interface NetworkSimulationConfig {
  readonly enabled: boolean;
  /** Extra delay added to every simulated segment response, in ms — models RTT. */
  readonly latencyMs: number;
  /** Caps the effective transfer rate for segment responses. `null` = no cap. */
  readonly maxBandwidthKbps: number | null;
}

export const NO_NETWORK_SIMULATION: NetworkSimulationConfig = {
  enabled: false,
  latencyMs: 0,
  maxBandwidthKbps: null,
};

/**
 * How long to hold a segment response before letting it resolve, given the
 * response's real byte size. Pure function — same discipline as
 * `clampSeekTarget`/`distinctQualityLevels` — so the one piece of actual
 * math here (bandwidth cap → delay) is unit-testable without a real
 * network response.
 *
 * Deliberately does *not* subtract however long the real fetch already
 * took: doing that accurately would require timing each request itself,
 * and the approximation here — total added delay, on top of whatever the
 * real transfer took — only ever makes the simulated condition *more*
 * constrained than the selected cap, never less. That's the safer
 * direction to be wrong in for a tool whose whole purpose is proving a
 * constrained network is being respected.
 */
export function computeSimulatedDelayMs(config: NetworkSimulationConfig, byteLength: number): number {
  if (!config.enabled) return 0;

  const bandwidthDelayMs = config.maxBandwidthKbps ? (byteLength * 8) / config.maxBandwidthKbps : 0;
  return config.latencyMs + bandwidthDelayMs;
}

export function networkSimulationConfigsEqual(
  a: NetworkSimulationConfig,
  b: NetworkSimulationConfig,
): boolean {
  return a.enabled === b.enabled && a.latencyMs === b.latencyMs && a.maxBandwidthKbps === b.maxBandwidthKbps;
}
