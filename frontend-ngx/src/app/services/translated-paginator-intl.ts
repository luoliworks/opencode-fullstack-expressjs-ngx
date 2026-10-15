import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

// Paginator labels in the active language. Registered in app.config as the
// MatPaginatorIntl provider.
@Injectable({ providedIn: 'root' })
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  private readonly translate = inject(TranslateService);

  constructor() {
    super();
    this.translate.onLangChange.subscribe(() => this.update());
    this.update();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) {
      return this.translate.instant('paginator.rangeEmpty', { length });
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return this.translate.instant('paginator.range', { start, end, length });
  };

  private update(): void {
    const t = (key: string): string => this.translate.instant(key);
    this.itemsPerPageLabel = t('paginator.itemsPerPage');
    this.firstPageLabel = t('paginator.first');
    this.previousPageLabel = t('paginator.previous');
    this.nextPageLabel = t('paginator.next');
    this.lastPageLabel = t('paginator.last');
    this.changes.next();
  }
}
