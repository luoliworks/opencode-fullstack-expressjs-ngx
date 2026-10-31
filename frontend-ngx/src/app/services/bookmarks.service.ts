import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

export interface Bookmark {
  id: number;
  userId: number;
  title: string;
  url: string;
  description: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkPage {
  items: Bookmark[];
  total: number;
  page: number;
  pageSize: number;
  tags?: string[];
}

export interface BookmarkQuery {
  page: number;
  pageSize: number;
  tag?: string;
}

export interface CreateBookmarkInput {
  title?: string;
  url: string;
  description?: string;
  tag?: string;
}

export interface UpdateBookmarkInput {
  title?: string;
  url?: string;
  description?: string;
  tag?: string;
}

@Injectable({ providedIn: 'root' })
export class BookmarksService {
  private readonly http = inject(HttpClient);

  list(): Observable<Bookmark[]>;
  list(query: BookmarkQuery): Observable<BookmarkPage>;
  list(query?: BookmarkQuery) {
    if (!query) return this.http.get<Bookmark[]>('/api/bookmarks');
    const params: Record<string, string> = {
      page: String(query.page),
      pageSize: String(query.pageSize),
    };
    if (query.tag && query.tag.trim() !== '') {
      params['tag'] = query.tag.trim();
    }
    return this.http.get<BookmarkPage>('/api/bookmarks', { params });
  }

  create(input: CreateBookmarkInput) {
    return this.http.post<Bookmark>('/api/bookmarks', input);
  }

  update(id: number, input: UpdateBookmarkInput) {
    return this.http.patch<Bookmark>(`/api/bookmarks/${id}`, input);
  }

  remove(id: number) {
    // 204 No Content — ask for text so HttpClient doesn't try to parse JSON.
    return this.http.delete(`/api/bookmarks/${id}`, { responseType: 'text' });
  }
}
