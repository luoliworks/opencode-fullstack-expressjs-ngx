import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';
import { ArticleDialog } from './article-dialog';

@Component({
  selector: 'app-admin-articles',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatPaginatorModule, MatTableModule, TranslatePipe],
  templateUrl: './admin-articles.html',
  styleUrl: './admin-articles.scss',
})
export class AdminArticles implements OnInit {
  private readonly articles = inject(ArticlesService);
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService);

  readonly rows = signal<Article[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingDeleteId = signal<number | null>(null);

  readonly columns = ['title', 'slug', 'status', 'updatedAt', 'actions'];

  ngOnInit(): void {
    this.load(1);
  }

  onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.load(event.pageIndex + 1);
  }

  load(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.error.set(null);
    this.articles.list({ page, pageSize: this.pageSize() }).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiError(err, 'articles.loadFailList'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(ArticleDialog, {
        data: {},
        maxWidth: '100vw',
        panelClass: 'fullscreen-dialog',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(1);
      });
  }

  openEdit(article: Article): void {
    this.dialog
      .open(ArticleDialog, {
        data: { article },
        maxWidth: '100vw',
        panelClass: 'fullscreen-dialog',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load(this.page());
      });
  }

  confirmDelete(id: number): void {
    this.pendingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  deleteArticle(id: number): void {
    this.pendingDeleteId.set(null);
    this.articles.remove(id).subscribe({
      // If the last row of the page was deleted, step back one page.
      next: () => this.load(this.rows().length <= 1 && this.page() > 1 ? this.page() - 1 : this.page()),
      error: (err: unknown) => this.error.set(apiError(err, 'common.deleteFailed')),
    });
  }
}
