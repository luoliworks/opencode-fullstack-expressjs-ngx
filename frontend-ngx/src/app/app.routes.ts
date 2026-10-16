import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { editorGuard } from './guards/editor.guard';
import { Admin } from './pages/admin/admin';
import { AdminArticles } from './pages/admin-articles/admin-articles';
import { AdminUsers } from './pages/admin-users/admin-users';
import { ArticleDetail } from './pages/article-detail/article-detail';
import { Articles } from './pages/articles/articles';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'articles', component: Articles },
  { path: 'a/:slug', component: ArticleDetail },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: 'admin/articles', component: AdminArticles, canActivate: [editorGuard] },
  { path: 'admin/users', component: AdminUsers, canActivate: [adminGuard] },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' },
];
