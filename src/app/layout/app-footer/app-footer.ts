import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

/**
 * Site footer.
 *
 * Doubles as the provenance notice: this is a technical demo built on publicly
 * published test streams, and saying so plainly belongs on every page.
 */
@Component({
  selector: 'sf-app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'block border-t border-white/8 mt-16' },
  template: `
    <div class="sf-gutter py-10">
      <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div class="max-w-md">
          <p class="text-sm font-black tracking-tight">
            Stream<span class="text-ember-500">Forge</span>
          </p>
          <p class="mt-2 text-xs leading-relaxed text-mist-400">
            A portfolio project demonstrating adaptive streaming in the browser: HLS and MPEG-DASH
            delivery through Shaka Player, Media Source Extensions, ABR behaviour and playback
            telemetry.
          </p>
        </div>

        <nav class="flex flex-col gap-2" aria-label="Footer">
          <a routerLink="/" class="footer-link">Home</a>
          <a routerLink="/diagnostics" class="footer-link">Diagnostics</a>
        </nav>
      </div>

      <p class="mt-8 border-t border-white/6 pt-6 text-[0.6875rem] leading-relaxed text-mist-500">
        Fictional titles presented over publicly published demo streams (Shaka demo assets, DASH-IF
        reference streams, Unified Streaming and Apple sample playlists). Not affiliated with any
        streaming service. No copyrighted content is hosted or referenced.
      </p>
      <p class="mt-2 text-[0.6875rem] text-mist-500">{{ appName }} · build {{ buildMode }}</p>
    </div>
  `,
  styles: `
    .footer-link {
      font-size: 0.8125rem;
      color: var(--color-mist-400);
      transition: color 0.2s;
    }
    .footer-link:hover {
      color: var(--color-mist-50);
    }
  `,
})
export class AppFooter {
  protected readonly appName = environment.appName;
  protected readonly buildMode = environment.production ? 'production' : 'development';
}
