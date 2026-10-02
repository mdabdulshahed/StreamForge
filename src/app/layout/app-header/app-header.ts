import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { environment } from '../../../environments/environment';

interface NavItem {
  readonly label: string;
  readonly path: string;
}

/**
 * Global navigation.
 *
 * Transparent over the hero, then solidifying into a frosted bar once the page
 * scrolls — the standard OTT treatment. The scroll listener flips a single
 * boolean signal, so it does not thrash change detection on every frame.
 */
@Component({
  selector: 'sf-app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  protected readonly appName = environment.appName;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Home', path: '/' },
    { label: 'Diagnostics', path: '/diagnostics' },
  ];

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    const isScrolled = window.scrollY > 24;
    // Guarded write: `set` on an unchanged value still notifies consumers.
    if (isScrolled !== this.scrolled()) this.scrolled.set(isScrolled);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
