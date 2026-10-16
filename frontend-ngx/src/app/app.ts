import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  readonly lang = inject(LanguageService);
  private readonly router = inject(Router);

  // The Manage dropdown has no routerLink of its own, so highlight it
  // manually while any /admin child route is active.
  isAdminSection(): boolean {
    return this.router.url.startsWith('/admin');
  }

  userInitial(): string {
    return (this.auth.currentUser()?.username?.[0] ?? '?').toUpperCase();
  }
}
