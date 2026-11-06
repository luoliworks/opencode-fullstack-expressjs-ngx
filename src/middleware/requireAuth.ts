import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { verifyToken, type AuthPayload } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  namespace Express {
    interface Request {
      auth?: Pick<AuthPayload, 'sub' | 'username' | 'role'>;
    }
  }
}

type RequestAuth = NonNullable<Request['auth']>;

// Verifies the JWT signature/expiry, then reloads the user from the database so
// that role changes and deletions take effect immediately instead of waiting
// for the token to expire. The DB row (not the token claims) is the source of
// truth for `username` and `role`. Returns null for invalid tokens or users
// that no longer exist.
export function resolveAuth(token: string): RequestAuth | null {
  const payload = verifyToken(token);
  if (payload === null) return null;
  const row = db
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .get();
  if (!row) return null;
  return { sub: row.id, username: row.username, role: row.role };
}

function bearerToken(req: Request): string | undefined {
  const header: string | undefined = req.header('Authorization');
  if (header === undefined || !header.startsWith('Bearer ')) return undefined;
  const token: string = header.slice('Bearer '.length).trim();
  return token === '' ? undefined : token;
}

// Best-effort auth for public routes that show more to privileged users.
// Never rejects; returns null when the caller is anonymous or the token is bad.
export function optionalAuth(req: Request): RequestAuth | null {
  const token: string | undefined = bearerToken(req);
  return token === undefined ? null : resolveAuth(token);
}

// Rejects requests without a valid `Authorization: Bearer <token>` header.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = bearerToken(req);
  if (token === undefined) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const auth = resolveAuth(token);
  if (auth === null) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.auth = auth;
  next();
}

// Allows either `Authorization: Bearer <token>` or `?token=<jwt>` so native
// HTML5 <audio> (Range seeking) and EventSource (SSE) can authenticate.
export function requireStreamAuth(req: Request, res: Response, next: NextFunction): void {
  let rawToken: string | undefined = bearerToken(req);
  if (rawToken === undefined && typeof req.query.token === 'string' && req.query.token.trim() !== '') {
    rawToken = req.query.token.trim();
  }
  if (!rawToken) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const auth = resolveAuth(rawToken);
  if (auth === null) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.auth = auth;
  next();
}
