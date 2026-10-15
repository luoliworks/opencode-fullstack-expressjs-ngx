import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, MatPaginatorModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly articlesApi = inject(ArticlesService);

  readonly articles = signal<Article[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.load(event.pageIndex + 1);
  }

  private load(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.loadError.set(null);
    this.articlesApi.list({ page, pageSize: this.pageSize(), status: 'published' }).subscribe({
      next: (res) => {
        this.articles.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('文章加载失败，请确认后端运行正常。');
        this.loading.set(false);
      },
    });
  }
}
