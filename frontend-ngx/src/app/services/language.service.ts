import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { setApiErrorTranslator } from '../utils/api-error';

const LANG_KEY = 'cms_lang';

export type AppLang = 'en' | 'zh';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly available: ReadonlyArray<{ code: AppLang; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
  ];

  readonly current = signal<AppLang>('en');

  constructor() {
    const saved = localStorage.getItem(LANG_KEY);
    const initial: AppLang = saved === 'zh' ? 'zh' : 'en';
    setApiErrorTranslator((key) => this.translate.instant(key));
    this.applyLang(initial);
  }

  /** Synchronous lookup for TS-side strings (validation messages, etc.). */
  t(key: string): string {
    return this.translate.instant(key);
  }

  switch(lang: AppLang): void {
    localStorage.setItem(LANG_KEY, lang);
    this.applyLang(lang);
  }

  private applyLang(lang: AppLang): void {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    this.translate.use(lang).subscribe({
      next: () => this.current.set(lang),
      error: () => this.current.set('en'),
    });
  }
}
