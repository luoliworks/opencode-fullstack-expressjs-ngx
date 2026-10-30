import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly lang = inject(LanguageService);

  readonly health = signal<string | null>(null);
  readonly healthOk = signal(false);

  ngOnInit(): void {
    this.http.get<{ status: string }>('/health').subscribe({
      next: (res) => {
        this.healthOk.set(res?.status === 'ok');
        this.health.set(JSON.stringify(res));
      },
      error: () => {
        this.healthOk.set(false);
        this.health.set(this.lang.t('home.liveFail'));
      },
    });
  }
}
