import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sf-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="sf-gutter grid min-h-[70vh] place-items-center py-24">
      <div class="max-w-md text-center">
        <p class="font-mono text-sm tracking-widest text-ember-500">404</p>
        <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Title not found</h1>
        <p class="mt-3 text-mist-300">
          That entry is not in the StreamForge catalog. It may have been removed, or the link may be
          incorrect.
        </p>
        <a
          routerLink="/"
          class="mt-7 inline-flex items-center rounded-lg bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ember-400"
        >
          Back to home
        </a>
      </div>
    </div>
  `,
})
export default class NotFound {}
