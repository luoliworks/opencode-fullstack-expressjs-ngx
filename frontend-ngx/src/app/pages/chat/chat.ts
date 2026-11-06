import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ChatMessage, ChatService } from '../../services/chat.service';

export interface MessageSegment {
  type: 'text' | 'link';
  value: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly zone = inject(NgZone);

  @ViewChild('feedContainer') feedContainer?: ElementRef<HTMLDivElement>;

  readonly messages = signal<ChatMessage[]>([]);
  readonly onlineUsers = signal<string[]>([]);
  readonly connected = signal(false);
  readonly sending = signal(false);
  readonly copiedId = signal<number | null>(null);

  draftText = '';

  private eventSource: EventSource | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.connectStream();
  }

  ngOnDestroy(): void {
    this.closeStream();
    if (this.copyTimer) {
      clearTimeout(this.copyTimer);
    }
  }

  private connectStream(): void {
    this.closeStream();
    const es = new EventSource(this.chatService.getStreamUrl());
    this.eventSource = es;

    es.onopen = () => {
      this.zone.run(() => {
        this.connected.set(true);
      });
    };

    es.onerror = () => {
      this.zone.run(() => {
        this.connected.set(false);
      });
    };

    es.addEventListener('snapshot', (e: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(e.data) as {
            messages: ChatMessage[];
            onlineUsers: string[];
          };
          this.messages.set(data.messages ?? []);
          this.onlineUsers.set(data.onlineUsers ?? []);
          this.scrollToBottom();
        } catch {
          // ignore malformed payload
        }
      });
    });

    es.addEventListener('message', (e: MessageEvent) => {
      this.zone.run(() => {
        try {
          const msg = JSON.parse(e.data) as ChatMessage;
          this.messages.update((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          this.scrollToBottom();
        } catch {
          // ignore
        }
      });
    });

    es.addEventListener('presence', (e: MessageEvent) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(e.data) as { onlineUsers: string[] };
          this.onlineUsers.set(data.onlineUsers ?? []);
        } catch {
          // ignore
        }
      });
    });

    es.addEventListener('clear', () => {
      this.zone.run(() => {
        this.messages.set([]);
      });
    });
  }

  private closeStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isMine(msg: ChatMessage): boolean {
    const current = this.auth.currentUser();
    return !!current && (msg.userId === current.id || msg.username === current.username);
  }

  userInitial(username: string): string {
    return (username?.trim()[0] ?? '?').toUpperCase();
  }

  parseSegments(text: string): MessageSegment[] {
    const segments: MessageSegment[] = [];
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const start = match.index;
      let url = match[0];

      // Strip common trailing sentence punctuation that is not part of the URL
      let trailing = '';
      while (/[.,;:!?]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }

      if (start > lastIndex) {
        segments.push({ type: 'text', value: text.slice(lastIndex, start) });
      }
      segments.push({ type: 'link', value: url });
      if (trailing) {
        segments.push({ type: 'text', value: trailing });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', value: text.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ type: 'text', value: text }];
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draftText.trim();
    if (!text || this.sending()) return;

    this.sending.set(true);
    this.chatService.sendMessage(text).subscribe({
      next: (msg) => {
        this.draftText = '';
        this.sending.set(false);
        this.messages.update((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        this.scrollToBottom();
      },
      error: () => {
        this.sending.set(false);
      },
    });
  }

  clearLobby(): void {
    this.chatService.clearMessages().subscribe({
      next: () => {
        this.messages.set([]);
      },
    });
  }

  copyMessage(msg: ChatMessage): void {
    const text = msg.text;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
    this.copiedId.set(msg.id);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => {
      this.copiedId.set(null);
    }, 1500);
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.feedContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 20);
  }
}
