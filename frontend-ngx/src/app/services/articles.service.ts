import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

  list() {
    return this.http.get<Article[]>('/api/articles');
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
