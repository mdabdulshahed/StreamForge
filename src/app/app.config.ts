import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless: change detection is driven by signals rather than by patched
    // async APIs. Important for a media app — a playing <video> fires timeupdate
    // several times a second, and under Zone.js each one would tick the whole
    // application.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Resolved route data is bound straight to component inputs.
      withComponentInputBinding(),
      // Restore scroll on back/forward; jump to top on forward navigation.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
  ],
};
