import { Injectable, signal } from '@angular/core';

import { NO_NETWORK_SIMULATION, type NetworkSimulationConfig } from '../models/network-simulation.model';

/**
 * Root-scoped, deliberately — unlike `StreamingPlayerService` (one Shaka
 * `Player` per `<video>` element, so component-scoped), the chosen network
 * condition is a cross-cutting dev-tools setting a developer picks once and
 * expects to carry across titles, the same way `PlaybackSessionRegistry`
 * needs root scope for state that outlives any one player instance.
 *
 * `StreamingPlayerService` reads `config()` fresh on every simulated
 * response, so changing the preset here takes effect on the very next
 * segment fetched — no re-registration needed on the player's side.
 */
@Injectable({ providedIn: 'root' })
export class NetworkSimulationService {
  readonly config = signal<NetworkSimulationConfig>(NO_NETWORK_SIMULATION);

  apply(config: NetworkSimulationConfig): void {
    this.config.set(config);
  }

  reset(): void {
    this.config.set(NO_NETWORK_SIMULATION);
  }
}
