import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { Admin } from './pages/admin/admin';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' },
];
