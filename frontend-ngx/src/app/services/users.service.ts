import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { PublicUser } from './auth.service';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  displayName?: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<PublicUser[]>('/api/users');
  }

  create(input: CreateUserInput) {
    return this.http.post<PublicUser>('/api/users', input);
  }

  update(id: number, input: UpdateUserInput) {
    return this.http.patch<PublicUser>(`/api/users/${id}`, input);
  }

  remove(id: number) {
    // 204 No Content — ask for text so HttpClient doesn't try to parse JSON.
    return this.http.delete(`/api/users/${id}`, { responseType: 'text' });
  }
}
