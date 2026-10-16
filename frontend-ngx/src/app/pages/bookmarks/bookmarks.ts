import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { Bookmark } from '../../services/bookmarks.service';
import { BookmarksService } from '../../services/bookmarks.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';
import { BookmarkDialog } from './bookmark-dialog';

@Component({
  selector: 'app-bookmarks',
  imports: [MatButtonModule, MatCardModule, MatDialogModule, MatIconModule, MatListModule, MatPaginatorModule, RouterLink, TranslatePipe],
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.scss',
})
export class Bookmarks implements OnInit {
  private readonly bookmarksApi = inject(BookmarksService);
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService);

  readonly bookmarks = signal<Bookmark[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly pendingDeleteId = signal<number | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  onPage(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.load(event.pageIndex + 1);
  }

  isExternal(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  openCreate(): void {
    const ref = this.dialog.open(BookmarkDialog, { data: null, width: '520px' });
    ref.afterClosed().subscribe((saved: boolean) => {
      if (saved) this.load(1);
    });
  }

  openEdit(bookmark: Bookmark): void {
    const ref = this.dialog.open(BookmarkDialog, { data: bookmark, width: '520px' });
    ref.afterClosed().subscribe((saved: boolean) => {
      if (saved) this.load(this.page());
    });
  }

  confirmDelete(id: number): void {
    this.pendingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  deleteBookmark(id: number): void {
    this.pendingDeleteId.set(null);
    this.bookmarksApi.remove(id).subscribe({
      next: () => this.load(this.page()),
      error: (err: unknown) => this.loadError.set(apiError(err, 'common.deleteFailed')),
    });
  }

  private load(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.loadError.set(null);
    this.bookmarksApi.list({ page, pageSize: this.pageSize() }).subscribe({
      next: (res) => {
        this.bookmarks.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(apiError(err, 'bookmarks.loadFail'));
        this.loading.set(false);
      },
    });
  }
}
