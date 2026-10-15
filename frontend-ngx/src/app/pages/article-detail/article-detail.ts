import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';

@Component({
  selector: 'app-article-detail',
  imports: [MatCardModule, MatButtonModule, RouterLink],
  templateUrl: './article-detail.html',
  styleUrl: './article-detail.scss',
})
export class ArticleDetail implements OnInit {
  private readonly articlesApi = inject(ArticlesService);
  private readonly route = inject(ActivatedRoute);

  readonly article = signal<Article | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.articlesApi.getBySlug(slug).subscribe({
      next: (row) => {
        // Drafts stay hidden on the public site even if the slug is known.
        this.article.set(row.status === 'published' ? row : null);
        this.notFound.set(row.status !== 'published');
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }
}
