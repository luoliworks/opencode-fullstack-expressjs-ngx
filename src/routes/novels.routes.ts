import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
// requireStreamAuth accepts `Authorization: Bearer <token>` or `?token=<jwt>` so HTML5 <audio>
// elements can stream and seek with Range requests while remaining protected.
import { requireAuth, requireStreamAuth } from '../middleware/requireAuth.js';

const novelsRouter: Router = Router();

// Resolves <repo-root>/mp3 both under tsx (src/routes) and compiled JS (dist/routes).
const mp3Root: string = path.join(__dirname, '..', '..', 'mp3');

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function resolveSafeChild(parentDir: string, segment: string): string | null {
  if (!segment || segment === '.' || segment === '..') return null;
  if (segment.includes('/') || segment.includes('\\') || segment.includes('\0')) return null;
  const resolved: string = path.resolve(parentDir, segment);
  const parentResolved: string = path.resolve(parentDir);
  if (!resolved.startsWith(parentResolved + path.sep)) return null;
  return resolved;
}

function isAudioFile(name: string): boolean {
  return /\.(mp3|m4a|ogg|wav)$/i.test(name);
}

// GET /api/novels
// Lists all novel folders under ./mp3 with chapter counts and total size.
novelsRouter.get('/', requireAuth, (_req: Request, res: Response) => {
  if (!fs.existsSync(mp3Root)) {
    res.json([]);
    return;
  }
  const entries = fs.readdirSync(mp3Root, { withFileTypes: true });
  const novels = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((dir) => {
      const dirPath: string = path.join(mp3Root, dir.name);
      const stat = fs.statSync(dirPath);
      const files = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((f) => f.isFile() && isAudioFile(f.name));
      let totalBytes = 0;
      for (const f of files) {
        try {
          totalBytes += fs.statSync(path.join(dirPath, f.name)).size;
        } catch {
          // ignore unreadable file
        }
      }
      return {
        name: dir.name,
        chapterCount: files.length,
        totalBytes,
        updatedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => collator.compare(a.name, b.name));

  res.json(novels);
});

// GET /api/novels/:novel
// Lists all audio chapters inside ./mp3/:novel sorted in natural chapter order.
novelsRouter.get('/:novel', requireAuth, (req: Request, res: Response) => {
  const novelName = String(req.params.novel ?? '');
  const novelDir = resolveSafeChild(mp3Root, novelName);
  if (!novelDir || !fs.existsSync(novelDir) || !fs.statSync(novelDir).isDirectory()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const files = fs
    .readdirSync(novelDir, { withFileTypes: true })
    .filter((f) => f.isFile() && isAudioFile(f.name))
    .sort((a, b) => collator.compare(a.name, b.name));

  let totalBytes = 0;
  const chapters = files.map((f) => {
    const filePath = path.join(novelDir, f.name);
    const sizeBytes = fs.statSync(filePath).size;
    totalBytes += sizeBytes;
    return {
      filename: f.name,
      title: f.name.replace(/\.(mp3|m4a|ogg|wav)$/i, ''),
      sizeBytes,
    };
  });

  res.json({
    name: novelName,
    chapterCount: chapters.length,
    totalBytes,
    chapters,
  });
});

// GET /api/novels/:novel/stream/:file
// Streams an audio chapter with full HTTP Range support for seeking.
novelsRouter.get('/:novel/stream/:file', requireStreamAuth, (req: Request, res: Response) => {
  const novelName = String(req.params.novel ?? '');
  const fileName = String(req.params.file ?? '');
  const novelDir = resolveSafeChild(mp3Root, novelName);
  if (!novelDir) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const filePath = resolveSafeChild(novelDir, fileName);
  if (
    !filePath ||
    !isAudioFile(fileName) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(filePath);
});

export default novelsRouter;
