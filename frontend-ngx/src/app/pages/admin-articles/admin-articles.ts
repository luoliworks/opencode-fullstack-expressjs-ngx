import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';
import { apiError } from '../../utils/api-error';
import { ArticleDialog } from './article-dialog';

@Component({
  selector: 'app-admin-articles',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatTableModule],
  templateUrl: './admin-articles.html',
  styleUrl: './admin-articles.scss',
})
export class AdminArticles implements OnInit {
  private readonly articles = inject(ArticlesService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Article[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingDeleteId = signal<number | null>(null);

  readonly columns = ['title', 'slug', 'status', 'updatedAt', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.articles.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiError(err, '文章列表加载失败。'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(ArticleDialog, {
        data: {},
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        panelClass: 'fullscreen-dialog',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  openEdit(article: Article): void {
    this.dialog
      .open(ArticleDialog, {
        data: { article },
        width: '100vw',
        maxWidth: '100vw',
        height: '100vh',
        panelClass: 'fullscreen-dialog',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
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
      next: () => this.load(),
      error: (err: unknown) => this.error.set(apiError(err, '删除失败。')),
    });
  }
}
