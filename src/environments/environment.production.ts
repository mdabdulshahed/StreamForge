import { KEY_SYSTEM, type Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  appName: 'StreamForge',
  diagnosticsPollIntervalMs: 1000,
  // Network simulation is a demo/testing affordance; keep it out of production.
  enableDeveloperTools: false,
  drm: {
    enabled: false,
    servers: {
      [KEY_SYSTEM.widevine]: '',
      [KEY_SYSTEM.playready]: '',
      [KEY_SYSTEM.fairplay]: '',
    },
  },
};
