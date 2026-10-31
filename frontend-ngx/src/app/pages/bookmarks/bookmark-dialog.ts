import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import type { Bookmark } from '../../services/bookmarks.service';
import { BookmarksService } from '../../services/bookmarks.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';

export interface BookmarkDialogData {
  bookmark: Bookmark | null;
  tags?: string[];
  selectedTag?: string | null;
}

@Component({
  selector: 'app-bookmark-dialog',
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './bookmark-dialog.html',
  styleUrl: './bookmark-dialog.scss',
})
export class BookmarkDialog {
  private readonly bookmarks = inject(BookmarksService);
  private readonly ref = inject(MatDialogRef<BookmarkDialog, boolean>);
  private readonly lang = inject(LanguageService);
  private readonly rawData: BookmarkDialogData | Bookmark | null = inject(MAT_DIALOG_DATA);

  protected readonly bookmark: Bookmark | null;
  readonly allTags: string[];

  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  title = '';
  url = '';
  tag = 'default';
  description = '';

  constructor() {
    let b: Bookmark | null = null;
    let passedTags: string[] = [];
    let initialTag: string | null = null;
    if (this.rawData && typeof this.rawData === 'object' && 'bookmark' in this.rawData) {
      b = this.rawData.bookmark;
      passedTags = this.rawData.tags ?? [];
      initialTag = this.rawData.selectedTag?.trim() || null;
    } else {
      b = this.rawData as Bookmark | null;
    }
    this.bookmark = b;

    const tagSet = new Set<string>(['default', ...passedTags]);
    if (b?.tag) tagSet.add(b.tag);
    if (initialTag) tagSet.add(initialTag);
    this.allTags = [
      'default',
      ...Array.from(tagSet)
        .filter((t) => t !== 'default')
        .sort(),
    ];

    if (b) {
      this.title = b.title;
      this.url = b.url;
      this.tag = b.tag || 'default';
      this.description = b.description;
    } else if (initialTag) {
      this.tag = initialTag;
    }
  }

  get isEdit(): boolean {
    return this.bookmark !== null;
  }

  get filteredTags(): string[] {
    const q = this.tag.trim().toLowerCase();
    // Show all options when empty or when the input matches an existing tag exactly
    if (!q || this.allTags.some((t) => t.toLowerCase() === q)) {
      return this.allTags;
    }
    return this.allTags.filter((t) => t.toLowerCase().includes(q));
  }

  pickTag(t: string): void {
    this.tag = t;
  }

  save(): void {
    this.error.set(null);
    const title = this.title.trim();
    const url = this.url.trim();
    const tag = this.tag.trim() || 'default';
    if (!url) {
      this.error.set(this.lang.t('bookmarks.errFill'));
      return;
    }
    this.busy.set(true);
    const payload = { title, url, tag, description: this.description };
    const done = {
      next: () => this.ref.close(true),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    };
    if (this.isEdit) {
      this.bookmarks.update((this.bookmark as Bookmark).id, payload).subscribe(done);
    } else {
      this.bookmarks.create(payload).subscribe(done);
    }
  }
}
