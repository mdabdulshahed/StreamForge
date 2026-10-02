import { KEY_SYSTEM, type Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  appName: 'StreamForge',
  diagnosticsPollIntervalMs: 500,
  enableDeveloperTools: true,
  drm: {
    // Disabled until a real protected test stream + license server are supplied.
    // See README "DRM" for how to point this at a Widevine test endpoint.
    enabled: false,
    servers: {
      [KEY_SYSTEM.widevine]: '',
      [KEY_SYSTEM.playready]: '',
      [KEY_SYSTEM.fairplay]: '',
    },
  },
};
