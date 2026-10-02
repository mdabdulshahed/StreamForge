import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppFooter } from './layout/app-footer/app-footer';
import { AppHeader } from './layout/app-header/app-header';

/** Application shell: fixed header, routed content, footer. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeader, AppFooter],
  template: `
    <sf-app-header />
    <main id="main" tabindex="-1" class="min-h-[60vh] outline-none">
      <router-outlet />
    </main>
    <sf-app-footer />
  `,
})
export class App {}
