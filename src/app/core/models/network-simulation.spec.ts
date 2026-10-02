import { describe, expect, it } from 'vitest';

import {
  computeSimulatedDelayMs,
  networkSimulationConfigsEqual,
  NO_NETWORK_SIMULATION,
  type NetworkSimulationConfig,
} from './network-simulation.model';

describe('computeSimulatedDelayMs', () => {
  it('is zero when simulation is disabled, regardless of other fields', () => {
    expect(
      computeSimulatedDelayMs({ enabled: false, latencyMs: 500, maxBandwidthKbps: 100 }, 10_000),
    ).toBe(0);
  });

  it('is just the latency when no bandwidth cap is set', () => {
    expect(computeSimulatedDelayMs({ enabled: true, latencyMs: 150, maxBandwidthKbps: null }, 10_000)).toBe(
      150,
    );
  });

  it('adds a bandwidth-proportional delay on top of latency', () => {
    // 8000 bytes at 400 kbps: (8000 * 8) / 400 = 160ms transfer + 150ms latency = 310ms
    expect(computeSimulatedDelayMs({ enabled: true, latencyMs: 150, maxBandwidthKbps: 400 }, 8_000)).toBe(
      310,
    );
  });

  it('scales with response size', () => {
    const config: NetworkSimulationConfig = { enabled: true, latencyMs: 0, maxBandwidthKbps: 800 };
    expect(computeSimulatedDelayMs(config, 200_000)).toBeGreaterThan(computeSimulatedDelayMs(config, 1_000));
  });
});

describe('networkSimulationConfigsEqual', () => {
  it('is true for two default configs', () => {
    expect(networkSimulationConfigsEqual(NO_NETWORK_SIMULATION, { ...NO_NETWORK_SIMULATION })).toBe(true);
  });

  it('is false when any field differs', () => {
    expect(
      networkSimulationConfigsEqual(NO_NETWORK_SIMULATION, { ...NO_NETWORK_SIMULATION, latencyMs: 1 }),
    ).toBe(false);
  });
});
