import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Admin-only area. Anonymous users fall through to /admin, whose own
// authGuard bounces them to /login.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn() && auth.currentUser()?.role === 'admin') return true;
  return inject(Router).createUrlTree(['/admin']);
};
