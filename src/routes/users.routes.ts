import { Router, type NextFunction, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, type User } from '../db/schema.js';
import { hashPassword } from '../utils/password.js';
import { requireAuth } from '../middleware/requireAuth.js';

const usersRouter: Router = Router();

type PublicUser = Omit<User, 'passwordHash'>;

function toPublic(row: User): PublicUser {
  const { passwordHash: _omitted, ...pub } = row;
  return pub;
}

function isUniqueViolation(err: unknown): boolean {
  // Drizzle v1 wraps the driver error (DrizzleQueryError.cause), so walk the chain.
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur instanceof Error; i++) {
    if (cur.message.includes('UNIQUE constraint failed')) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

function parseId(raw: string | string[], res: Response): number | null {
  if (typeof raw !== 'string') {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  const id: number = Number(raw);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return id;
}

// GET /api/users
usersRouter.get('/', (_req: Request, res: Response) => {
  res.json(db.select().from(users).all().map(toPublic));
});

// GET /api/users/:id
usersRouter.get('/:id', (req: Request, res: Response) => {
  const id: number | null = parseId(req.params.id, res);
  if (id === null) return;
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(toPublic(row));
});

// POST /api/users  { username, email, password, displayName?, role? }
// Open only for bootstrapping the very first user; afterwards requires auth.
usersRouter.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    const existing = db.select({ id: users.id }).from(users).limit(1).all();
    if (existing.length > 0) {
      requireAuth(req, res, next);
      return;
    }
    next();
  },
  (req: Request, res: Response) => {
  const { username, email, password, displayName, role } = req.body as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    role?: unknown;
  };
  if (typeof username !== 'string' || username.trim() === '') {
    res.status(400).json({ error: 'username is required' });
    return;
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'valid email is required' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' });
    return;
  }
  if (role !== undefined && !(ROLES as readonly unknown[]).includes(role)) {
    res.status(400).json({ error: "role must be 'admin', 'editor' or 'viewer'" });
    return;
  }
  try {
    const row = db
      .insert(users)
      .values({
        username: username.trim(),
        email: email.trim(),
        passwordHash: hashPassword(password),
        displayName: typeof displayName === 'string' ? displayName : '',
        ...(role === undefined ? {} : { role: role as Role }),
      })
      .returning()
      .get();
    res.status(201).json(toPublic(row));
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'username or email already exists' });
      return;
    }
    throw err;
  }
});

// PATCH /api/users/:id  { username?, email?, password?, displayName?, role? }
usersRouter.patch('/:id', requireAuth, (req: Request, res: Response) => {
  const id: number | null = parseId(req.params.id, res);
  if (id === null) return;
  const { username, email, password, displayName, role } = req.body as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    role?: unknown;
  };
  if (email !== undefined && (typeof email !== 'string' || !email.includes('@'))) {
    res.status(400).json({ error: 'valid email is required' });
    return;
  }
  if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
    res.status(400).json({ error: 'password must be at least 8 characters' });
    return;
  }
  if (role !== undefined && !(ROLES as readonly unknown[]).includes(role)) {
    res.status(400).json({ error: "role must be 'admin', 'editor' or 'viewer'" });
    return;
  }
  try {
    const row = db
      .update(users)
      .set({
        ...(typeof username === 'string' ? { username } : {}),
        ...(typeof email === 'string' ? { email } : {}),
        ...(typeof password === 'string' ? { passwordHash: hashPassword(password) } : {}),
        ...(typeof displayName === 'string' ? { displayName } : {}),
        ...(role === undefined ? {} : { role: role as Role }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
      .get();
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(toPublic(row));
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'username or email already exists' });
      return;
    }
    throw err;
  }
});

// DELETE /api/users/:id
usersRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const id: number | null = parseId(req.params.id, res);
  if (id === null) return;
  const row = db.delete(users).where(eq(users.id, id)).returning().get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
});

export default usersRouter;
