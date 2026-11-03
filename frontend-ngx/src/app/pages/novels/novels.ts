import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { NovelProgress, NovelSummary } from '../../services/novels.service';
import { NovelsService } from '../../services/novels.service';
import { apiError } from '../../utils/api-error';

@Component({
  selector: 'app-novels',
  imports: [MatCardModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './novels.html',
  styleUrl: './novels.scss',
})
export class Novels implements OnInit {
  readonly novelsApi = inject(NovelsService);

  readonly novels = signal<NovelSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.novelsApi.list().subscribe({
      next: (rows) => {
        this.novels.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(apiError(err, 'novels.loadFail'));
        this.loading.set(false);
      },
    });
  }

  progressFor(novelName: string): NovelProgress | null {
    return this.novelsApi.getProgress(novelName);
  }

  chapterLabel(filename: string): string {
    return filename.replace(/\.(mp3|m4a|ogg|wav)$/i, '');
  }
}
