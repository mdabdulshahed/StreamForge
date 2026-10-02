import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Cinematic poster artwork for a title.
 *
 * The catalog ships fictional titles over public test streams, so there is no
 * licensed key art to display. Rather than hot-linking images that can rot,
 * this renders a *deterministic* duotone poster derived from the asset id:
 * the same title always produces the same artwork, and there is no network
 * request to fail. If a real `src` is ever supplied it wins.
 */
@Component({
  selector: 'sf-poster-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block overflow-hidden bg-ink-850',
    '[attr.role]': '"img"',
    '[attr.aria-label]': 'ariaLabel()',
  },
  // Layers live inside a wrapper rather than being positioned against the host
  // directly, so callers stay free to set the host's own `position` (the hero
  // and details pages both mount this as an absolutely positioned backdrop).
  template: `
    <div class="relative isolate h-full w-full">
      @if (src()) {
        <img
          [src]="src()"
          [alt]="''"
          loading="lazy"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover"
        />
      } @else {
        <div class="absolute inset-0" [style.background]="gradient()"></div>

        <!-- Soft key light, offset so the composition is not centred. -->
        <div
          class="absolute inset-0 opacity-70"
          [style.background]="'radial-gradient(120% 90% at 78% 12%, rgba(255,255,255,.28), transparent 58%)'"
        ></div>

        <!-- Ghosted monogram: large, cropped, low contrast. -->
        <span
          aria-hidden="true"
          class="absolute font-black leading-none select-none text-white/12"
          [style.font-size]="'clamp(4rem, 62cqw, 16rem)'"
          [style.left]="'-.06em'"
          [style.bottom]="'-.24em'"
        >
          {{ monogram() }}
        </span>

        <!-- Film grain, kept as an inline SVG so nothing is fetched. -->
        <div
          aria-hidden="true"
          class="absolute inset-0 opacity-[0.16] mix-blend-overlay"
          [style.background-image]="grain"
        ></div>

        <!-- Bottom scrim so overlaid text stays legible. -->
        <div
          aria-hidden="true"
          class="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/70 to-transparent"
        ></div>
      }
    </div>
  `,
  styles: `
    :host {
      container-type: inline-size;
    }
  `,
})
export class PosterArt {
  /** Stable identity used to derive the artwork. Usually the asset id. */
  readonly seed = input.required<string>();
  /** Title, used for the monogram and the accessible label. */
  readonly title = input.required<string>();
  /** Optional real image; overrides the procedural artwork when present. */
  readonly src = input<string | undefined>(undefined);

  protected readonly grain =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

  protected readonly ariaLabel = computed(() => `Artwork for ${this.title()}`);

  /** First letters of up to two words — reads as a title treatment, not text. */
  protected readonly monogram = computed(() =>
    this.title()
      .replace(/[^\p{L}\p{N} ]/gu, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected readonly gradient = computed(() => {
    const h = hash(this.seed());
    // Two hues a fixed distance apart keeps every poster a *duotone* rather
    // than a muddy multi-hue blend, which is what makes the set feel curated.
    const hue = h % 360;
    const partner = (hue + 38) % 360;
    return (
      `linear-gradient(152deg, ` +
      `hsl(${hue} 68% 46%) 0%, ` +
      `hsl(${partner} 62% 24%) 46%, ` +
      `hsl(${partner} 48% 9%) 100%)`
    );
  });
}

/** FNV-1a — small, dependency-free, and stable across runs. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}
