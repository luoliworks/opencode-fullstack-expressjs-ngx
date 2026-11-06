import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
}

export interface ChatSnapshot {
  messages: ChatMessage[];
  onlineUsers: string[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getMessages(): Observable<ChatSnapshot> {
    return this.http.get<ChatSnapshot>('/api/chat/messages');
  }

  sendMessage(text: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>('/api/chat/messages', { text });
  }

  clearMessages(): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>('/api/chat/messages');
  }

  getStreamUrl(): string {
    const token = this.auth.token ?? '';
    return `/api/chat/stream?token=${encodeURIComponent(token)}`;
  }
}
