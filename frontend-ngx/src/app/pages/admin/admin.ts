import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  imports: [MatCardModule, MatListModule, MatButtonModule, RouterLink, TranslatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  readonly articleCount = signal<number | null>(null);
  readonly userCount = signal<number | null>(null);
  readonly userForbidden = signal(false);

  ngOnInit(): void {
    this.http.get<unknown[]>('/api/articles').subscribe({
      next: (rows) => this.articleCount.set(rows.length),
      error: () => this.articleCount.set(null),
    });
    this.http.get<unknown[]>('/api/users').subscribe({
      next: (rows) => this.userCount.set(rows.length),
      error: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 403) {
          this.userForbidden.set(true);
        } else {
          this.userCount.set(null);
        }
      },
    });
  }
}
