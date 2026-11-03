import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface NovelSummary {
  name: string;
  chapterCount: number;
  totalBytes: number;
  updatedAt: string;
}

export interface NovelChapter {
  filename: string;
  title: string;
  sizeBytes: number;
}

export interface NovelDetail {
  name: string;
  chapterCount: number;
  totalBytes: number;
  chapters: NovelChapter[];
}

export interface NovelProgress {
  filename: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const SPEED_KEY = 'cms_novel_speed';

@Injectable({ providedIn: 'root' })
export class NovelsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  list(): Observable<NovelSummary[]> {
    return this.http.get<NovelSummary[]>('/api/novels');
  }

  getNovel(name: string): Observable<NovelDetail> {
    return this.http.get<NovelDetail>(`/api/novels/${encodeURIComponent(name)}`);
  }

  streamUrl(novel: string, filename: string): string {
    const token = this.auth.token ?? '';
    return `/api/novels/${encodeURIComponent(novel)}/stream/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  }

  private progressKey(novel: string): string {
    const uid = this.auth.currentUser()?.id ?? 'anon';
    return `cms_novel_progress_${uid}_${novel}`;
  }

  getProgress(novel: string): NovelProgress | null {
    try {
      const raw = localStorage.getItem(this.progressKey(novel));
      if (!raw) return null;
      return JSON.parse(raw) as NovelProgress;
    } catch {
      return null;
    }
  }

  saveProgress(novel: string, progress: NovelProgress): void {
    try {
      localStorage.setItem(this.progressKey(novel), JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }

  getSpeed(): number {
    const raw = Number(localStorage.getItem(SPEED_KEY));
    return [0.75, 1, 1.25, 1.5, 2].includes(raw) ? raw : 1;
  }

  saveSpeed(speed: number): void {
    try {
      localStorage.setItem(SPEED_KEY, String(speed));
    } catch {
      // ignore
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }

  formatTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const total = Math.floor(sec);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}
