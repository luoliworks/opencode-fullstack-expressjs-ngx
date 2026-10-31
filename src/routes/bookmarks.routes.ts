import { Router, type Request, type Response } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookmarks } from '../db/schema.js';
import { requireAuth } from '../middleware/requireAuth.js';

const bookmarksRouter: Router = Router();

// All routes require login. Bookmarks are strictly private: every query is
// scoped to req.auth.sub, so users (including admins) only ever see their own.
// Non-owned ids answer 404 to avoid leaking other users' existence.

// Accepts absolute http(s) URLs and site-internal paths (/a/xxx).
// Bare domains get https:// prepended; other schemes are rejected.
function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value: string = raw.trim();
  if (value === '') return null;
  if (value.startsWith('/')) {
    return value.startsWith('//') ? null : value;
  }
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  return `https://${value}`;
}

function parseId(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const id: number = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function normalizeTag(raw: unknown): string {
  if (typeof raw !== 'string') return 'default';
  const trimmed: string = raw.trim();
  return trimmed === '' ? 'default' : trimmed;
}

// GET /api/bookmarks
// No params -> plain array (legacy shape, unchanged; optional ?tag= filters).
// ?page=&pageSize=[&tag=] -> { items, total, page, pageSize, tags }.
bookmarksRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId: number = req.auth!.sub;
  const userScope = eq(bookmarks.userId, userId);
  const rawTag: string | undefined =
    typeof req.query.tag === 'string' && req.query.tag.trim() !== ''
      ? req.query.tag.trim()
      : undefined;
  const scope = rawTag ? and(userScope, eq(bookmarks.tag, rawTag)) : userScope;
  const order = [desc(bookmarks.createdAt), desc(bookmarks.id)];
  const { page: rawPage, pageSize: rawSize } = req.query;
  if (rawPage === undefined && rawSize === undefined) {
    res.json(db.select().from(bookmarks).where(scope).orderBy(...order).all());
    return;
  }
  const page: number = Math.max(1, Number(rawPage ?? 1));
  const pageSize: number = Math.min(100, Math.max(1, Number(rawSize ?? 20)));
  if (!Number.isInteger(page) || !Number.isInteger(pageSize)) {
    res.status(400).json({ error: 'page and pageSize must be positive integers' });
    return;
  }
  const offset: number = (page - 1) * pageSize;
  const total: number = db.select({ n: count() }).from(bookmarks).where(scope).get()?.n ?? 0;
  const items = db.select().from(bookmarks).where(scope).orderBy(...order).limit(pageSize).offset(offset).all();
  const tagRows = db
    .selectDistinct({ tag: bookmarks.tag })
    .from(bookmarks)
    .where(userScope)
    .orderBy(bookmarks.tag)
    .all();
  const tags: string[] = tagRows.map((r) => r.tag);
  res.json({ items, total, page, pageSize, tags });
});

// POST /api/bookmarks  { url, title?, description?, tag? }
// Title is optional — blank/missing titles fall back to the normalized URL.
// Tag is optional — blank/missing tags fall back to 'default'.
bookmarksRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const { title, url, description, tag } = req.body as {
    title?: unknown;
    url?: unknown;
    description?: unknown;
    tag?: unknown;
  };
  const normalized: string | null = normalizeUrl(url);
  if (normalized === null) {
    res.status(400).json({ error: 'url is invalid' });
    return;
  }
  const row = db
    .insert(bookmarks)
    .values({
      userId: req.auth!.sub,
      title: typeof title === 'string' && title.trim() !== '' ? title.trim() : normalized,
      url: normalized,
      description: typeof description === 'string' ? description : '',
      tag: normalizeTag(tag),
    })
    .returning()
    .get();
  res.status(201).json(row);
});

// PATCH /api/bookmarks/:id  { title?, url?, description?, tag? }
// A blank title falls back to the final (new or existing) URL.
bookmarksRouter.patch('/:id', requireAuth, (req: Request, res: Response) => {
  const id: number | null = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { title, url, description, tag } = req.body as {
    title?: unknown;
    url?: unknown;
    description?: unknown;
    tag?: unknown;
  };
  let normalized: string | undefined;
  if (url !== undefined) {
    const parsed: string | null = normalizeUrl(url);
    if (parsed === null) {
      res.status(400).json({ error: 'url is invalid' });
      return;
    }
    normalized = parsed;
  }
  const existing = db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, req.auth!.sub)))
    .get();
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const finalUrl: string = normalized ?? existing.url;
  const row = db
    .update(bookmarks)
    .set({
      ...(title === undefined || typeof title !== 'string'
        ? {}
        : { title: title.trim() !== '' ? title.trim() : finalUrl }),
      ...(normalized === undefined ? {} : { url: normalized }),
      ...(typeof description === 'string' ? { description } : {}),
      ...(tag === undefined ? {} : { tag: normalizeTag(tag) }),
      updatedAt: new Date(),
    })
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, req.auth!.sub)))
    .returning()
    .get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});

// DELETE /api/bookmarks/:id
bookmarksRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const id: number | null = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const row = db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, req.auth!.sub)))
    .returning()
    .get();
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
});

export default bookmarksRouter;
