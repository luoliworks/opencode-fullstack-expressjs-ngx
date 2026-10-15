import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import type { Article } from '../../services/articles.service';
import { ArticlesService } from '../../services/articles.service';
import { LanguageService } from '../../services/language.service';
import { apiError } from '../../utils/api-error';
import { slugify } from '../../utils/slug';

export interface ArticleDialogData {
  article?: Article; // undefined = create mode
}

@Component({
  selector: 'app-article-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe],
  templateUrl: './article-dialog.html',
  styleUrl: './article-dialog.scss',
})
export class ArticleDialog {
  private readonly articles = inject(ArticlesService);
  private readonly ref = inject(MatDialogRef<ArticleDialog, boolean>);
  protected readonly data: ArticleDialogData = inject(MAT_DIALOG_DATA);
  private readonly lang = inject(LanguageService);

  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  title = '';
  slug = '';
  content = '';
  status = 'draft';
  private slugTouched = false;

  constructor() {
    const a = this.data.article;
    if (a) {
      this.title = a.title;
      this.slug = a.slug;
      this.content = a.content;
      this.status = a.status;
    }
  }

  get isEdit(): boolean {
    return this.data.article !== undefined;
  }

  // Create mode only: derive slug from the title until the user edits it
  // by hand. Never auto-touches edit mode (would break published URLs).
  onTitleChange(value: string): void {
    if (!this.isEdit && !this.slugTouched) {
      this.slug = slugify(value);
    }
  }

  onSlugChange(): void {
    this.slugTouched = true;
  }

  save(): void {
    this.error.set(null);
    const title = this.title.trim();
    const slug = this.slug.trim();
    if (!title || !slug) {
      this.error.set(this.lang.t('articles.errFill'));
      return;
    }
    this.busy.set(true);
    const payload = { title, slug, content: this.content, status: this.status };
    const done = {
      next: () => this.ref.close(true),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    };
    if (this.isEdit) {
      this.articles.update(this.data.article!.id, payload).subscribe(done);
    } else {
      this.articles.create(payload).subscribe(done);
    }
  }
}
