import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticlePage {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArticleQuery {
  page: number;
  pageSize: number;
  status?: string;
}

export interface CreateArticleInput {
  title: string;
  slug: string;
  content?: string;
  status?: string;
}

export interface UpdateArticleInput {
  title?: string;
  slug?: string;
  content?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly http = inject(HttpClient);

  list(): Observable<Article[]>;
  list(query: ArticleQuery): Observable<ArticlePage>;
  list(query?: ArticleQuery) {
    if (!query) return this.http.get<Article[]>('/api/articles');
    const params: Record<string, string> = {
      page: String(query.page),
      pageSize: String(query.pageSize),
    };
    if (query.status) params['status'] = query.status;
    return this.http.get<ArticlePage>('/api/articles', { params });
  }

  getBySlug(slug: string) {
    return this.http.get<Article>(`/api/articles/slug/${encodeURIComponent(slug)}`);
  }

  create(input: CreateArticleInput) {
    return this.http.post<Article>('/api/articles', input);
  }

  update(id: number, input: UpdateArticleInput) {
    return this.http.patch<Article>(`/api/articles/${id}`, input);
  }

  remove(id: number) {
    // 204 No Content — ask for text so HttpClient doesn't try to parse JSON.
    return this.http.delete(`/api/articles/${id}`, { responseType: 'text' });
  }
}
