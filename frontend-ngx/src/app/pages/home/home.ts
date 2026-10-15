import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
}

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);

  readonly articles = signal<Article[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<Article[]>('/api/articles').subscribe({
      next: (rows) => {
        // Public listing shows published articles only.
        this.articles.set(rows.filter((a) => a.status === 'published'));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('文章加载失败，请确认后端运行正常。');
        this.loading.set(false);
      },
    });
  }
}
