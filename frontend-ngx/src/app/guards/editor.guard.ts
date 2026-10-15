import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Editor and admin area. Anonymous users fall through to /admin, whose own
// authGuard bounces them to /login.
export const editorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.currentUser()?.role;
  if (auth.isLoggedIn() && (role === 'admin' || role === 'editor')) return true;
  return inject(Router).createUrlTree(['/admin']);
};
