import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { Admin } from './pages/admin/admin';
import { AdminUsers } from './pages/admin-users/admin-users';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: 'admin/users', component: AdminUsers, canActivate: [adminGuard] },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' },
];
