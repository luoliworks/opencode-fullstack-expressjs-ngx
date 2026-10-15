import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { PublicUser } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { UsersService } from '../../services/users.service';
import { apiError } from '../../utils/api-error';
import { UserDialog } from './user-dialog';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatDialogModule, MatTableModule, TranslatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private readonly users = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly lang = inject(LanguageService);

  readonly rows = signal<PublicUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingDeleteId = signal<number | null>(null);

  readonly columns = ['username', 'email', 'displayName', 'role', 'createdAt', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.users.list().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiError(err, 'users.loadFailList'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(UserDialog, { data: {}, width: '480px' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  openEdit(user: PublicUser): void {
    this.dialog
      .open(UserDialog, { data: { user }, width: '480px' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }

  confirmDelete(id: number): void {
    this.pendingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  deleteUser(id: number): void {
    this.pendingDeleteId.set(null);
    this.users.remove(id).subscribe({
      next: () => this.load(),
      error: (err: unknown) => this.error.set(apiError(err, 'common.deleteFailed')),
    });
  }
}
