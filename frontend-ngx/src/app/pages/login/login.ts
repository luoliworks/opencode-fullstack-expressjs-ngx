import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);

  readonly loading = signal(true);
  readonly setupMode = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  username = '';
  email = '';
  password = '';
  confirmPassword = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      void this.router.navigate(['/admin']);
      return;
    }
    this.auth.needsSetup().subscribe({
      next: (res) => {
        this.setupMode.set(res.needsSetup);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(this.lang.t('login.errBackendDown'));
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    this.error.set(null);
    if (this.setupMode()) {
      this.createAdminAndLogin();
    } else {
      this.doLogin(this.username.trim(), this.password);
    }
  }

  private createAdminAndLogin(): void {
    const username = this.username.trim();
    const email = this.email.trim();
    if (!username || !email.includes('@') || this.password.length < 8) {
      this.error.set(this.lang.t('login.errFillAll'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set(this.lang.t('login.errPwMismatch'));
      return;
    }
    this.busy.set(true);
    this.auth.createAdmin({ username, email, password: this.password }).subscribe({
      next: () => this.doLogin(username, this.password),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    });
  }

  private doLogin(username: string, password: string): void {
    if (!username || !password) {
      this.error.set(this.lang.t('login.errFillLogin'));
      return;
    }
    this.busy.set(true);
    this.auth.login(username, password).subscribe({
      next: () => {
        void this.router.navigate(['/']);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    });
  }
}
