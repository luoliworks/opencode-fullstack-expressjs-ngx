import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-articles',
  imports: [DatePipe, MatCardModule, MatIconModule, MatPaginatorModule, RouterLink, TranslatePipe],
  templateUrl: './articles.html',
  styleUrl: './articles.scss',
})
export class Articles implements OnInit {
  private readonly articlesApi = inject(ArticlesService);
  private readonly lang = inject(LanguageService);

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
        this.loadError.set(this.lang.t('articlesList.loadFail'));
        this.loading.set(false);
      },
    });
  }
}
