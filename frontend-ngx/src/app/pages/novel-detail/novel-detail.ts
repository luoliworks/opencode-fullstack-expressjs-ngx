import {
  Component,
   type ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { NovelChapter, NovelDetail } from '../../services/novels.service';
import { NovelsService } from '../../services/novels.service';
import { apiError } from '../../utils/api-error';

@Component({
  selector: 'app-novel-detail',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './novel-detail.html',
  styleUrl: './novel-detail.scss',
})
export class NovelDetailPage implements OnInit, OnDestroy {
  readonly novelsApi = inject(NovelsService);
  private readonly route = inject(ActivatedRoute);

  private readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  readonly novel = signal<NovelDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly currentChapter = signal<NovelChapter | null>(null);
  readonly audioSrc = signal<string>('');
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly speed = signal(this.novelsApi.getSpeed());
  readonly autoNext = signal(true);
  readonly searchQuery = signal('');

  readonly speeds = [0.75, 1, 1.25, 1.5, 2];

  private pendingSeekTime = 0;
  private shouldAutoPlayOnLoad = false;
  private lastSavedAt = 0;

  readonly filteredChapters = computed(() => {
    const detail = this.novel();
    if (!detail) return [];
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return detail.chapters;
    return detail.chapters.filter(
      (c) => c.title.toLowerCase().includes(q) || c.filename.toLowerCase().includes(q),
    );
  });

  readonly currentIndex = computed(() => {
    const detail = this.novel();
    const cur = this.currentChapter();
    if (!detail || !cur) return -1;
    return detail.chapters.findIndex((c) => c.filename === cur.filename);
  });

  readonly hasPrev = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => {
    const detail = this.novel();
    const idx = this.currentIndex();
    return !!detail && idx >= 0 && idx < detail.chapters.length - 1;
  });

  ngOnInit(): void {
    const name = this.route.snapshot.paramMap.get('name');
    if (!name) {
      this.loadError.set('Novel not found');
      this.loading.set(false);
      return;
    }
    this.novelsApi.getNovel(name).subscribe({
      next: (detail) => {
        this.novel.set(detail);
        this.loading.set(false);
        this.initInitialChapter(detail);
      },
      error: (err: unknown) => {
        this.loadError.set(apiError(err, 'novels.loadFail'));
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.persistProgress(true);
    const el = this.audioRef()?.nativeElement;
    if (el) {
      el.pause();
    }
  }

  private initInitialChapter(detail: NovelDetail): void {
    if (detail.chapters.length === 0) return;
    const saved = this.novelsApi.getProgress(detail.name);
    if (saved) {
      const found = detail.chapters.find((c) => c.filename === saved.filename);
      if (found) {
        this.selectChapterInternal(found, saved.currentTime, false);
        return;
      }
    }
    this.selectChapterInternal(detail.chapters[0], 0, false);
  }

  playChapter(chapter: NovelChapter): void {
    const cur = this.currentChapter();
    if (cur && cur.filename === chapter.filename) {
      this.togglePlay();
      return;
    }
    this.selectChapterInternal(chapter, 0, true);
  }

  private selectChapterInternal(chapter: NovelChapter, startTime: number, autoPlay: boolean): void {
    const detail = this.novel();
    if (!detail) return;
    this.currentChapter.set(chapter);
    this.currentTime.set(startTime);
    this.duration.set(0);
    this.pendingSeekTime = startTime;
    this.shouldAutoPlayOnLoad = autoPlay;
    this.audioSrc.set(this.novelsApi.streamUrl(detail.name, chapter.filename));

    setTimeout(() => {
      const el = this.audioRef()?.nativeElement;
      if (!el) return;
      el.load();
      el.playbackRate = this.speed();
      if (autoPlay) {
        void el.play().catch(() => {
          this.isPlaying.set(false);
        });
      }
    }, 0);
  }

  togglePlay(): void {
    const el = this.audioRef()?.nativeElement;
    if (!el) return;
    if (el.paused) {
      el.playbackRate = this.speed();
      void el.play();
    } else {
      el.pause();
    }
  }

  prevChapter(): void {
    const detail = this.novel();
    const idx = this.currentIndex();
    if (!detail || idx <= 0) return;
    this.selectChapterInternal(detail.chapters[idx - 1], 0, true);
  }

  nextChapter(): void {
    const detail = this.novel();
    const idx = this.currentIndex();
    if (!detail || idx < 0 || idx >= detail.chapters.length - 1) return;
    this.selectChapterInternal(detail.chapters[idx + 1], 0, true);
  }

  skip(deltaSec: number): void {
    const el = this.audioRef()?.nativeElement;
    if (!el) return;
    const target = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + deltaSec));
    el.currentTime = target;
    this.currentTime.set(target);
    this.persistProgress(true);
  }

  onSeek(event: Event): void {
    const el = this.audioRef()?.nativeElement;
    if (!el) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      el.currentTime = value;
      this.currentTime.set(value);
      this.persistProgress(true);
    }
  }

  setSpeed(rate: number): void {
    this.speed.set(rate);
    this.novelsApi.saveSpeed(rate);
    const el = this.audioRef()?.nativeElement;
    if (el) {
      el.playbackRate = rate;
    }
  }

  toggleAutoNext(): void {
    this.autoNext.update((v) => !v);
  }

  onLoadedMetadata(): void {
    const el = this.audioRef()?.nativeElement;
    if (!el) return;
    this.duration.set(Number.isFinite(el.duration) ? el.duration : 0);
    el.playbackRate = this.speed();
    if (this.pendingSeekTime > 0 && this.pendingSeekTime < (el.duration || Infinity)) {
      el.currentTime = this.pendingSeekTime;
      this.currentTime.set(this.pendingSeekTime);
    }
    this.pendingSeekTime = 0;
    if (this.shouldAutoPlayOnLoad) {
      this.shouldAutoPlayOnLoad = false;
      void el.play().catch(() => {
        this.isPlaying.set(false);
      });
    }
  }

  onTimeUpdate(): void {
    const el = this.audioRef()?.nativeElement;
    if (!el) return;
    this.currentTime.set(el.currentTime);
    if (Number.isFinite(el.duration) && el.duration > 0) {
      this.duration.set(el.duration);
    }
    this.persistProgress(false);
  }

  onEnded(): void {
    this.isPlaying.set(false);
    if (this.autoNext() && this.hasNext()) {
      this.nextChapter();
    }
  }

  private persistProgress(force: boolean): void {
    const now = Date.now();
    if (!force && now - this.lastSavedAt < 2000) return;
    const detail = this.novel();
    const cur = this.currentChapter();
    if (!detail || !cur) return;
    this.lastSavedAt = now;
    this.novelsApi.saveProgress(detail.name, {
      filename: cur.filename,
      currentTime: this.currentTime(),
      duration: this.duration(),
      updatedAt: now,
    });
  }
}
