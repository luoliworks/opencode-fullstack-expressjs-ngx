import { Router, type Request, type Response } from 'express';
import { count, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const articlesRouter: Router = Router();

type ArticleStatus = 'draft' | 'published';

function parseStatus(raw: unknown): ArticleStatus | undefined | null {
  if (raw === undefined) return undefined;
  if (raw === 'draft' || raw === 'published') return raw;
  return null;
}

// GET /api/articles
// No params -> plain array (legacy shape, unchanged).
// ?page=&pageSize=[&status=] -> { items, total, page, pageSize }.
articlesRouter.get('/', (req: Request, res: Response) => {
  const { page: rawPage, pageSize: rawSize, status: rawStatus } = req.query;
  if (rawPage === undefined && rawSize === undefined && rawStatus === undefined) {
    res.json(db.select().from(articles).orderBy(desc(articles.createdAt), desc(articles.id)).all());
    return;
  }
  const page: number = Math.max(1, Number(rawPage ?? 1));
  const pageSize: number = Math.min(100, Math.max(1, Number(rawSize ?? 20)));
  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) {
    res.status(400).json({ error: 'page and pageSize must be positive integers' });
    return;
  }
  const status: ArticleStatus | undefined | null = parseStatus(rawStatus);
  if (status === null) {
    res.status(400).json({ error: "status must be 'draft' or 'published'" });
    return;
  }
  const offset: number = (page - 1) * pageSize;
  const total: number =
    status === undefined
      ? (db.select({ n: count() }).from(articles).get()?.n ?? 0)
      : (db.select({ n: count() }).from(articles).where(eq(articles.status, status)).get()?.n ?? 0);
  const items =
    status === undefined
      ? db.select().from(articles).orderBy(desc(articles.createdAt), desc(articles.id)).limit(pageSize).offset(offset).all()
      : db.select().from(articles).where(eq(articles.status, status)).orderBy(desc(articles.createdAt), desc(articles.id)).limit(pageSize).offset(offset).all();
  res.json({ items, total, page, pageSize });
});

// GET /api/articles/slug/:slug (public, for the detail page)
articlesRouter.get('/slug/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (typeof slug !== 'string' || slug === '') {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  const row = db.select().from(articles).where(eq(articles.slug, slug)).get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
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
articlesRouter.post('/', requireAuth, requireRole('admin', 'editor'), (req: Request, res: Response) => {
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
articlesRouter.patch('/:id', requireAuth, requireRole('admin', 'editor'), (req: Request, res: Response) => {
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
articlesRouter.delete('/:id', requireAuth, requireRole('admin', 'editor'), (req: Request, res: Response) => {
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
