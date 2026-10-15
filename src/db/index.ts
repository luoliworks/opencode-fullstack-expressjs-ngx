import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

// src/db (tsx) and dist/db (compiled) both resolve this way to the repo root.
function repoPath(...segments: string[]): string {
  return path.join(__dirname, '..', '..', ...segments);
}

// Override with DATABASE_PATH=/somewhere/cms.db — defaults to ./db/app.db.
const dbFile: string = process.env.DATABASE_PATH ?? repoPath('db', 'app.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const sqlite = new DatabaseSync(dbFile);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA busy_timeout = 5000;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle({ client: sqlite });

// Apply pending migrations from ./drizzle (committed SQL, always in the repo).
migrate(db, { migrationsFolder: repoPath('drizzle') });

export type Db = typeof db;
