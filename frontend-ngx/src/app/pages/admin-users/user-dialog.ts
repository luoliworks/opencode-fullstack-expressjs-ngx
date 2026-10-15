import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { PublicUser } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { apiError } from '../../utils/api-error';

export interface UserDialogData {
  user?: PublicUser; // undefined = create mode
}

@Component({
  selector: 'app-user-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './user-dialog.html',
})
export class UserDialog {
  private readonly users = inject(UsersService);
  private readonly ref = inject(MatDialogRef<UserDialog, boolean>);
  protected readonly data: UserDialogData = inject(MAT_DIALOG_DATA);

  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  username = '';
  email = '';
  password = '';
  displayName = '';
  role = 'viewer';

  constructor() {
    const u = this.data.user;
    if (u) {
      this.username = u.username;
      this.email = u.email;
      this.displayName = u.displayName;
      this.role = u.role;
    }
  }

  get isEdit(): boolean {
    return this.data.user !== undefined;
  }

  save(): void {
    this.error.set(null);
    const username = this.username.trim();
    const email = this.email.trim();
    if (!username || !email.includes('@')) {
      this.error.set('请填写用户名和有效邮箱。');
      return;
    }
    if (!this.isEdit && this.password.length < 8) {
      this.error.set('新建用户时密码至少 8 位。');
      return;
    }
    if (this.isEdit && this.password !== '' && this.password.length < 8) {
      this.error.set('新密码至少 8 位（留空则不修改）。');
      return;
    }
    this.busy.set(true);
    const payload = {
      username,
      email,
      displayName: this.displayName,
      role: this.role,
      ...(this.password === '' ? {} : { password: this.password }),
    };
    const done = {
      next: () => this.ref.close(true),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(apiError(err));
      },
    };
    if (this.isEdit) {
      this.users.update(this.data.user!.id, payload).subscribe(done);
    } else {
      this.users.create({ ...payload, password: this.password }).subscribe(done);
    }
  }
}
