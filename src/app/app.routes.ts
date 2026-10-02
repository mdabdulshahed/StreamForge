import type { Routes } from '@angular/router';

import { assetResolver } from './core/resolvers/asset.resolver';

/**
 * Application routes.
 *
 * Every feature is lazily loaded via `loadComponent`, so each route becomes its
 * own bundle. This matters more than usual here: Shaka Player is a large
 * dependency and lands in the player chunk from Phase 3, and there is no reason
 * for someone browsing the catalog to download a media engine they are not
 * using yet.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'StreamForge — Adaptive streaming',
    loadComponent: () => import('./features/home/home'),
  },
  {
    path: 'video/:id',
    title: 'Title details — StreamForge',
    resolve: { asset: assetResolver },
    loadComponent: () => import('./features/video-details/video-details'),
  },
  {
    path: 'player/:id',
    title: 'Player — StreamForge',
    resolve: { asset: assetResolver },
    loadComponent: () => import('./features/player/player-page'),
  },
  {
    path: 'diagnostics',
    title: 'Diagnostics — StreamForge',
    loadComponent: () => import('./features/diagnostics/diagnostics-page'),
  },
  {
    path: 'not-found',
    title: 'Not found — StreamForge',
    loadComponent: () => import('./features/not-found/not-found'),
  },
  { path: '**', redirectTo: 'not-found' },
];
