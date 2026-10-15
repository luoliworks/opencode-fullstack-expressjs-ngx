import { Router, type Request, type Response } from 'express';
import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

const authRouter: Router = Router();

// POST /api/login  { username, password }
// `username` accepts either the username or the email address.
// Always returns 401 with the same message to avoid user enumeration.
authRouter.post('/', (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }
  const row = db
    .select()
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, username)))
    .get();
  if (!row || !verifyPassword(password, row.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const { passwordHash: _omitted, ...pub } = row;
  res.json({
    token: signToken({ id: row.id, username: row.username, role: row.role }),
    user: pub,
  });
});

export default authRouter;
