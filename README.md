# Simple CMS — Express + TypeScript + Angular

Full-stack CMS: an Express.js API in TypeScript (SQLite via `node:sqlite` + Drizzle ORM) with an Angular frontend. Serves the Angular production build when present, otherwise falls back to the static page in `public/`.

> This project was generated with [OpenCode](https://opencode.ai).

## Prerequisites

- Node.js (v24 used here)
- npm 11

## Install

```cmd
npm install
```

## Scripts

| Command         | What it does                        |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start dev server with hot reload (`tsx watch src/index.ts`) |
| `npm run build` | Compile TypeScript to `dist/` (`tsc`) |
| `npm start`     | Run the compiled server (`node dist/index.js`) |

Build before starting in production:

```cmd
npm run build
npm start
```

## Frontend dev (Angular)

Run the backend and the Angular dev server in two terminals:

```cmd
:: terminal 1 (repo root) — Express API on :3000
npm run dev
```

```cmd
:: terminal 2 — Angular on :4200, /api proxied to :3000 (see frontend-ngx/proxy.conf.json)
cd frontend-ngx
npm install
npm run dev
```

First run in a browser: open `http://localhost:4200` and create the admin account (the backend bootstraps the very first user without auth).

## Frontend routes

| Path | Page | Access |
| ---- | ---- | ------ |
| `/` | Project home (info, endpoints, backend live check) | public |
| `/articles` | Published article list | public |
| `/a/:slug` | Article detail | public |
| `/bookmarks` | Own bookmarks, self-managed inline | login |
| `/login` | Sign in / first-run admin bootstrap | public |
| `/admin` | Dashboard | login |
| `/admin/articles` | Article management | editor+ |
| `/admin/users` | User management | admin |

## i18n

`@ngx-translate/core` + `@ngx-translate/http-loader` (v18), runtime JSON dictionaries in `frontend-ngx/public/assets/i18n/` (`en.json` default, `zh.json`). The toolbar `EN/中文` menu switches at runtime and persists to `localStorage`. Backend English error strings are mapped to keys in `src/app/utils/api-error.ts`. To add a language: add `<lang>.json` and register it in `src/app/services/language.service.ts`.

## Configuration

- `PORT` env var sets the listen port (default `3000`).
- To run a second instance alongside the default one (e.g. for testing), use another port:

```cmd
set PORT=3001 && node dist/index.js
```

## Database

SQLite via Node's built-in `node:sqlite` + Drizzle ORM (`drizzle-orm@1.0.0-rc.4`, pinned).

- DB file lives at `./db/app.db` (created on first run, git-ignored); override with `DATABASE_PATH`.
- Schema in `src/db/schema.ts`; migrations in `./drizzle/` (applied automatically at startup).
- After changing the schema: `npx drizzle-kit generate` (uses `drizzle.config.ts`).

## Auth

- `POST /api/login` with `{ "username": "<name or email>", "password": "<password>" }` returns `{ "token": "<JWT>", "user": { ... } }`.
- Send the token on protected requests: `Authorization: Bearer <JWT>`. Article reads stay public; article writes and everything under `/api/bookmarks` require auth.
- Roles: `viewer` reads only; `editor` additionally manages articles; `admin` additionally manages users (user reads/writes are admin-only). Insufficient role → `403`. Bookmarks are per-user private (any role, strictly your own — even admins can't see others').
- The very first `POST /api/users` is open (bootstrapping the admin); afterwards it requires admin too.
- `JWT_SECRET` env var signs tokens (insecure dev fallback with a startup warning if unset); `JWT_EXPIRES_IN` overrides lifetime in seconds (default 7 days).

## Static frontend resolution

`src/app.ts` serves the Angular production build when present, otherwise falls back to `public/`:

1. `frontend-ngx/dist/frontend-ngx/browser/` — after `npm run build` inside `frontend-ngx/`
2. `public/` — always in the repo; what a fresh clone serves before the Angular build exists

When serving the Angular build, unknown non-API `GET` routes fall back to Angular's `index.html` (SPA client-side routing). The `public/` fallback keeps its exact legacy behavior (no SPA fallback).

## Endpoints

Articles are ordered newest-first (`createdAt DESC, id DESC`).

| Method | Path         | Description                          |
| ------ | ------------ | ------------------------------------ |
| GET    | `/`          | Angular app, or `public/` fallback page when no Angular build exists |
| GET    | `/health`    | Health check → `{ "status": "ok" }`  |
| GET    | `/api`       | API index, lists available endpoints |
| GET    | `/api/hello` | Sample endpoint → `{ "message": "Hello, World!" }` |
| GET    | `/api/setup` | `{ "needsSetup": true }` when no users exist yet (admin bootstrap) |
| POST   | `/api/login` | Login with `{ username, password }` → `{ token, user }` |
| GET    | `/api/articles` | Article array (legacy shape). With `?page=&pageSize=[&status=]` → `{ items, total, page, pageSize }` (`pageSize` clamped to 1–100) |
| POST   | `/api/articles` | Create article (editor+) |
| GET    | `/api/articles/slug/:slug` | Read one article by slug (public) |
| GET/PATCH/DELETE | `/api/articles/:id` | Read (public) / update+delete (editor+) one article |
| GET    | `/api/bookmarks` | Own bookmarks, login required (array; with `?page=&pageSize=` → `{ items, total, page, pageSize }`). Non-owned ids answer `404` |
| POST   | `/api/bookmarks` | Create bookmark (any logged-in user). `{ url, title?, description? }` — blank/missing title falls back to the URL. Accepts absolute `http(s)` URLs and site-internal paths (`/a/xxx`); bare domains get `https://` prepended; other schemes → `400` |
| PATCH/DELETE | `/api/bookmarks/:id` | Update (blank title falls back to the final URL) / delete own bookmark |
| GET    | `/api/users` | List users (admin only; open only to bootstrap the first user via POST) |
| POST   | `/api/users` | Create user (admin only, except the very first bootstrap user) |
| GET/PATCH/DELETE | `/api/users/:id` | Read / update / delete one user (admin only) |
| GET    | `/style.css`, `/app.js`, ... | Any other static file in `public/` |

## Project structure

```
simple-cms/
  public/               Fallback static page (served at / when no Angular build exists)
    index.html
    style.css
    app.js
  frontend-ngx/         Angular frontend (home, articles, bookmarks, login, admin area; EN default + ZH via ngx-translate)
    src/app/
      app.html/app.ts/app.scss  Brand toolbar (responsive hamburger), Manage dropdown, avatar + language menus
      pages/            home, articles, article-detail, bookmarks (+dialog), login, admin, admin-articles (+dialog), admin-users (+dialog)
      services/         auth, articles, bookmarks, users API clients; language (translate + persistence)
      guards/           auth (logged in), admin, editor role guards
      interceptors/     Bearer token injection for /api calls
      utils/            api-error (backend error → i18n key), slug
    public/assets/i18n/ en.json, zh.json runtime dictionaries
    proxy.conf.json     Dev proxy: /api, /health -> http://localhost:3000
  src/
    index.ts            Server bootstrap (reads PORT, calls listen)
    app.ts              Express app: static hosting + router mounting
    db/
      schema.ts         Drizzle tables (articles, users, bookmarks)
      index.ts          node:sqlite connection, WAL pragmas, auto-migration
    middleware/
      requireAuth.ts    Bearer JWT check (401)
      requireRole.ts    viewer/editor/admin authorization (403)
    routes/
      api.routes.ts     Aggregates all /api/* routers
      articles.routes.ts Articles CRUD + pagination + slug lookup
      bookmarks.routes.ts Private per-user bookmarks CRUD (auth only, no roles)
      users.routes.ts   Users CRUD (admin, bootstrap-open for the first user)
      auth.routes.ts    POST /api/login
      setup.routes.ts   GET /api/setup (needsSetup flag)
      hello.routes.ts   GET /api/hello
      health.routes.ts  GET /health
    utils/
      jwt.ts            HS256 JWT on node:crypto (no dependency)
      password.ts       scrypt hashing + verification
  drizzle/              Committed migrations (auto-applied at startup)
  drizzle.config.ts     drizzle-kit config (schema in, ./drizzle out)
  db/                   SQLite files, created at runtime (git-ignored)
  dist/                 Compiled output (generated by npm run build)
  tsconfig.json         Strict TS config (rootDir src, outDir dist)
```

`src/app.ts` only mounts routers — route logic lives in `src/routes/`.

## Adding a new API resource

1. Create `src/routes/<name>.routes.ts`:

```ts
import { Router, type Request, type Response } from 'express';

const usersRouter: Router = Router();

usersRouter.get('/', (_req: Request, res: Response) => {
  res.json([]);
});

export default usersRouter;
```

2. Mount it in `src/routes/api.routes.ts`:

```ts
import usersRouter from './users.routes.js';

apiRouter.use('/users', usersRouter);
```

3. Rebuild and verify: `npm run build`, then `GET /api/users`.

Note the `.js` extension in relative imports (e.g. `./users.routes.js`) — required by `module: NodeNext` even though the source files are `.ts`.
