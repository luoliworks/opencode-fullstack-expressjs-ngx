import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';

const articlesRouter: Router = Router();

// GET /api/articles
articlesRouter.get('/', (_req: Request, res: Response) => {
  res.json(db.select().from(articles).all());
});

// GET /api/articles/:id
articlesRouter.get('/:id', (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const row = db.select().from(articles).where(eq(articles.id, id)).get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

function isUniqueViolation(err: unknown): boolean {
  // Drizzle v1 wraps the driver error (DrizzleQueryError.cause), so walk the chain.
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur instanceof Error; i++) {
    if (cur.message.includes('UNIQUE constraint failed')) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

// POST /api/articles  { title, slug, content?, status? }
articlesRouter.post('/', (req: Request, res: Response) => {
  const { title, slug, content, status } = req.body as {
    title?: unknown;
    slug?: unknown;
    content?: unknown;
    status?: unknown;
  };
  if (typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (typeof slug !== 'string' || slug.trim() === '') {
    res.status(400).json({ error: 'slug is required' });
    return;
  }
  if (status !== undefined && status !== 'draft' && status !== 'published') {
    res.status(400).json({ error: "status must be 'draft' or 'published'" });
    return;
  }
  try {
    const row = db
      .insert(articles)
      .values({
        title: title.trim(),
        slug: slug.trim(),
        content: typeof content === 'string' ? content : '',
        ...(status === undefined ? {} : { status }),
      })
      .returning()
      .get();
    res.status(201).json(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'slug already exists' });
      return;
    }
    throw err;
  }
});

// PATCH /api/articles/:id  { title?, slug?, content?, status? }
articlesRouter.patch('/:id', (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { title, slug, content, status } = req.body as {
    title?: unknown;
    slug?: unknown;
    content?: unknown;
    status?: unknown;
  };
  if (status !== undefined && status !== 'draft' && status !== 'published') {
    res.status(400).json({ error: "status must be 'draft' or 'published'" });
    return;
  }
  try {
    const row = db
      .update(articles)
      .set({
        ...(typeof title === 'string' ? { title } : {}),
        ...(typeof slug === 'string' ? { slug } : {}),
        ...(typeof content === 'string' ? { content } : {}),
        ...(status === undefined ? {} : { status }),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning()
      .get();
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'slug already exists' });
      return;
    }
    throw err;
  }
});

// DELETE /api/articles/:id
articlesRouter.delete('/:id', (req: Request, res: Response) => {
  const id: number = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const row = db.delete(articles).where(eq(articles.id, id)).returning().get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
});

export default articlesRouter;
