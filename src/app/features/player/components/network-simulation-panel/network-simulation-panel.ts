import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  networkSimulationConfigsEqual,
  NO_NETWORK_SIMULATION,
  type NetworkSimulationConfig,
} from '../../../../core/models';
import { NetworkSimulationService } from '../../../../core/services/network-simulation.service';

interface NetworkPreset {
  readonly name: string;
  readonly config: NetworkSimulationConfig;
}

/**
 * Preset names borrowed from the naming convention browser DevTools' own
 * network throttling already made familiar, rather than inventing new
 * terminology for the same idea. Bandwidth/latency figures are
 * representative real-world figures for each condition, not measured from
 * anything — the point of a preset is a recognizable starting point, not a
 * precise spec.
 */
const PRESETS: readonly NetworkPreset[] = [
  { name: 'No simulation (real network)', config: NO_NETWORK_SIMULATION },
  { name: 'Fast 4G', config: { enabled: true, latencyMs: 40, maxBandwidthKbps: 4_000 } },
  { name: 'Slow 4G', config: { enabled: true, latencyMs: 150, maxBandwidthKbps: 1_200 } },
  { name: 'Slow 3G', config: { enabled: true, latencyMs: 300, maxBandwidthKbps: 400 } },
  { name: 'Very constrained', config: { enabled: true, latencyMs: 800, maxBandwidthKbps: 100 } },
];

/**
 * Dev-tools panel (spec's network simulation panel) — gated by
 * `environment.enableDeveloperTools` at the call site in `PlayerPage`, not
 * inside this component itself, matching how every other dev-only surface
 * in this app is gated at its point of use.
 *
 * Picking a preset here changes what `StreamingPlayerService`'s response
 * filter actually does to real segment responses on the very next fetch —
 * see `NetworkSimulationService`'s doc comment. This panel only ever reads
 * and writes that shared config; it has no player-specific logic of its
 * own.
 */
@Component({
  selector: 'sf-network-simulation-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './network-simulation-panel.html',
  styleUrl: './network-simulation-panel.scss',
})
export class NetworkSimulationPanel {
  private readonly networkSim = inject(NetworkSimulationService);

  protected readonly presets = PRESETS;
  protected readonly activeConfig = this.networkSim.config;

  protected isActive(preset: NetworkPreset): boolean {
    return networkSimulationConfigsEqual(preset.config, this.activeConfig());
  }

  protected select(preset: NetworkPreset): void {
    this.networkSim.apply(preset.config);
  }
}
