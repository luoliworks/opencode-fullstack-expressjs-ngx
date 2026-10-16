import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatCardModule, MatListModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly lang = inject(LanguageService);

  readonly health = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<{ status: string }>('/health').subscribe({
      next: (res) => this.health.set(JSON.stringify(res)),
      error: () => this.health.set(this.lang.t('home.liveFail')),
    });
  }
}
