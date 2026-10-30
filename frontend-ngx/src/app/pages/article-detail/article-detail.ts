import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';
import { AuthService } from '../../services/auth.service';
import { BookmarksService } from '../../services/bookmarks.service';

@Component({
  selector: 'app-article-detail',
  imports: [DatePipe, MatCardModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './article-detail.html',
  styleUrl: './article-detail.scss',
})
export class ArticleDetail implements OnInit {
  readonly auth = inject(AuthService);
  private readonly articlesApi = inject(ArticlesService);
  private readonly bookmarksApi = inject(BookmarksService);
  private readonly route = inject(ActivatedRoute);

  readonly article = signal<Article | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly bookmarkId = signal<number | null>(null);
  readonly bookmarkBusy = signal(false);

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
        const pub = row.status === 'published' ? row : null;
        this.article.set(pub);
        this.notFound.set(!pub);
        this.loading.set(false);
        if (pub && this.auth.isLoggedIn()) {
          this.checkBookmark(`/a/${pub.slug}`);
        }
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  toggleBookmark(): void {
    const art = this.article();
    if (!art || this.bookmarkBusy()) return;
    this.bookmarkBusy.set(true);
    const existingId = this.bookmarkId();
    if (existingId !== null) {
      this.bookmarksApi.remove(existingId).subscribe({
        next: () => {
          this.bookmarkId.set(null);
          this.bookmarkBusy.set(false);
        },
        error: () => this.bookmarkBusy.set(false),
      });
    } else {
      this.bookmarksApi
        .create({
          title: art.title,
          url: `/a/${art.slug}`,
          description: art.content ? art.content.slice(0, 120) : '',
        })
        .subscribe({
          next: (created) => {
            this.bookmarkId.set(created.id);
            this.bookmarkBusy.set(false);
          },
          error: () => this.bookmarkBusy.set(false),
        });
    }
  }

  private checkBookmark(path: string): void {
    this.bookmarksApi.list().subscribe({
      next: (items) => {
        const match = items.find((b) => b.url === path);
        this.bookmarkId.set(match ? match.id : null);
      },
    });
  }
}
