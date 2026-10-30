import { Component, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    TranslatePipe,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  readonly lang = inject(LanguageService);
  private readonly router = inject(Router);

  private readonly drawer = viewChild<MatSidenav>('drawer');

  readonly role = computed(() => this.auth.currentUser()?.role ?? null);
  readonly canEditArticles = computed(() => this.role() === 'admin' || this.role() === 'editor');
  readonly isAdmin = computed(() => this.role() === 'admin');

  constructor() {
    // Keep in sync with the 719px breakpoint in app.scss: if the window is
    // widened past it while the drawer is open, close the drawer.
    inject(BreakpointObserver)
      .observe('(min-width: 720px)')
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        if (state.matches) void this.drawer()?.close();
      });
  }

  // The Admin dropdown has no routerLink of its own, so highlight it
  // manually while any /admin child route is active.
  isAdminSection(): boolean {
    return this.router.url.startsWith('/admin');
  }

  userInitial(): string {
    return (this.auth.currentUser()?.username?.[0] ?? '?').toUpperCase();
  }

  closeDrawer(): void {
    void this.drawer()?.close();
  }

  logout(): void {
    this.closeDrawer();
    this.auth.logout();
  }
}
