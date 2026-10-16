import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import type { Bookmark } from '../../services/bookmarks.service';
import { BookmarksService } from '../../services/bookmarks.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';

@Component({
  selector: 'app-bookmark-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
  templateUrl: './bookmark-dialog.html',
  styleUrl: './bookmark-dialog.scss',
})
export class BookmarkDialog {
  private readonly bookmarks = inject(BookmarksService);
  private readonly ref = inject(MatDialogRef<BookmarkDialog, boolean>);
  private readonly lang = inject(LanguageService);
  // null = create mode, Bookmark = edit mode.
  protected readonly data: Bookmark | null = inject(MAT_DIALOG_DATA);

  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  title = '';
  url = '';
  description = '';

  constructor() {
    const b = this.data;
    if (b) {
      this.title = b.title;
      this.url = b.url;
      this.description = b.description;
    }
  }

  get isEdit(): boolean {
    return this.data !== null;
  }

  save(): void {
    this.error.set(null);
    const title = this.title.trim();
    const url = this.url.trim();
    if (!title || !url) {
      this.error.set(this.lang.t('bookmarks.errFill'));
      return;
    }
    this.busy.set(true);
    const payload = { title, url, description: this.description };
    const done = {
      next: () => this.ref.close(true),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    };
    if (this.isEdit) {
      this.bookmarks.update((this.data as Bookmark).id, payload).subscribe(done);
    } else {
      this.bookmarks.create(payload).subscribe(done);
    }
  }
}
