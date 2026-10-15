import type { NextFunction, Request, Response } from 'express';

// Role hierarchy: viewer < editor < admin.
// Must run after requireAuth (relies on req.auth being set).
// viewer: reads only (all GETs are public anyway)
// editor: + articles CRUD
// admin: + users CRUD
export function requireRole(...roles: Array<'admin' | 'editor' | 'viewer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.auth.role as 'admin' | 'editor' | 'viewer')) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
