import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const setupRouter: Router = Router();

// GET /api/setup — tells the frontend whether the admin account
// still needs to be bootstrapped (no users exist yet).
setupRouter.get('/', (_req: Request, res: Response) => {
  const existing = db.select({ id: users.id }).from(users).limit(1).all();
  res.json({ needsSetup: existing.length === 0 });
});

export default setupRouter;
