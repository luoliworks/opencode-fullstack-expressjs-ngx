import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type AuthPayload } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  namespace Express {
    interface Request {
      auth?: Pick<AuthPayload, 'sub' | 'username' | 'role'>;
    }
  }
}

// Rejects requests without a valid `Authorization: Bearer <token>` header.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header: string | undefined = req.header('Authorization');
  if (header === undefined || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (payload === null) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.auth = { sub: payload.sub, username: payload.username, role: payload.role };
  next();
}
