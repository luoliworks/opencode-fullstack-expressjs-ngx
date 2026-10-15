import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function apiError(err: unknown, fallback = '请求失败，请重试。'): string {
  const body = (err as { error?: unknown })?.error;
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return fallback;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
    this.auth.needsSetup().subscribe({
      next: (res) => {
        this.setupMode.set(res.needsSetup);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('无法连接后端（/api/setup）。请确认 Express 跑在 :3000，且 ng serve 走了 proxy。');
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
      this.error.set('请填写用户名、有效邮箱，且密码至少 8 位。');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('两次输入的密码不一致，请重新输入。');
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
      this.error.set('请输入用户名和密码。');
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
