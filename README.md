# Simple CMS — Express + TypeScript + Angular

Full-stack CMS, Personal Bookmark Manager, Local MP3 Audiobook Player, and Family LAN Chat Lobby: an Express 5 API in TypeScript (SQLite via `node:sqlite` + Drizzle ORM) paired with an Angular 22 + Material 3 standalone SPA. Serves the Angular build when present, otherwise falls back to the static page in `public/`.

> This project was initially generated with [OpenCode](https://opencode.ai) and is now modified and maintained using **Google Antigravity** (powered by Claude Opus 5.5 and Gemini 4 Argon).

## Prerequisites

- Node.js (v24+ recommended)
- npm 11+

## Install

```cmd
npm install
cd frontend-ngx && npm install
```

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start backend dev server with hot reload (`tsx watch src/index.ts`) |
| `npm run build` | Compile backend TypeScript to `dist/` (`tsc`) |
| `npm start` | Run the compiled server (`node dist/index.js`) |
| `npm --prefix frontend-ngx run build -- --configuration development` | Build the Angular SPA into `frontend-ngx/dist/frontend-ngx/browser` |

Build before starting in production:

```cmd
npm --prefix frontend-ngx run build -- --configuration development
npm run build
npm start
```

## Frontend dev (Angular)

Run the backend and the Angular dev server in two terminals, or build `frontend-ngx` and let Express serve everything directly on `:3000` (HTTP) and `:3443` (HTTPS):

```cmd
:: terminal 1 (repo root) — Express API on :3000 (and :3443 when certs exist)
npm run dev
```

```cmd
:: terminal 2 — Angular on :4200, /api proxied to :3000 (see frontend-ngx/proxy.conf.json)
cd frontend-ngx
npm run dev
```

First run in a browser: open `http://localhost:3000` (or `http://localhost:4200`) and create the admin account (the backend bootstraps the very first user without auth).

## Local HTTPS (LAN Support)

To enable HTTPS for `localhost`, `127.0.0.1`, and all LAN IPs in `192.168.2.1–254` and `192.168.8.1–254` (required for browser Web Notifications on LAN devices):

```bash
bash certs/encode.sh
```

This generates `certs/req.cnf`, `certs/cert.key`, and `certs/cert.pem` (git-ignored). When `certs/cert.key` and `certs/cert.pem` are present, `src/index.ts` automatically starts both:
- **HTTP server** on `PORT` (default `3000`, bound to `0.0.0.0`)
- **HTTPS server** on `HTTPS_PORT` (default `3443`, bound to `0.0.0.0`)

## Frontend routes

| Path | Page | Access |
| ---- | ---- | ------ |
| `/` | Project home (overview, architecture highlights, endpoints, live backend check) | public |
| `/articles` | Article list with plain-text Markdown excerpts (published for public/viewers; includes draft badges for `editor+`) | public |
| `/a/:slug` | Article detail with XSS-safe Markdown rendering and one-click bookmarking (`#article`) | public |
| `/bookmarks` | Personal bookmarks with `#tag` filter pills, quick tag picker, and `mat-autocomplete` | login |
| `/novels` | Local MP3 audiobooks browser (lists novel folders under `./mp3`) | login |
| `/novels/:name` | Audiobook chapter player (sticky horizontal console, HTTP Range seeking, `0.75x`–`2x` speed, `Auto-next`, `localStorage` resume) | login |
| `/chat` | Family LAN chat lobby (in-memory real-time SSE chat, auto-linked URLs, one-click copy, Web Notification alerts) | login |
| `/login` | Sign in / first-run admin bootstrap | public |
| `/admin` | Dashboard | login |
| `/admin/articles` | Article management with Markdown Write / Preview tabs | editor+ |
| `/admin/users` | User management | admin |

## i18n

`@ngx-translate/core` + `@ngx-translate/http-loader` (v18), runtime JSON dictionaries in `frontend-ngx/public/assets/i18n/` (`en.json` default, `zh.json`). The toolbar `EN/中文` menu switches at runtime and persists to `localStorage`. Backend English error strings are mapped to keys in `src/app/utils/api-error.ts`. To add a language: add `<lang>.json` and register it in `src/app/services/language.service.ts`.

## Configuration

- `PORT` env var sets the HTTP listen port (default `3000`).
- `HTTPS_PORT` env var sets the HTTPS listen port when `certs/cert.key` and `certs/cert.pem` exist (default `3443`).
- `DATABASE_PATH` overrides the SQLite database path (default `./db/app.db`).
- `JWT_SECRET` sets the HS256 signing secret (required when `NODE_ENV=production`; auto-generates and persists a 256-bit random secret in `./db/.jwt-secret` in development).
- `JWT_EXPIRES_IN` overrides token lifetime in seconds (default `604800` = 7 days).

## Database

SQLite via Node's built-in `node:sqlite` + Drizzle ORM (`drizzle-orm@1.0.0-rc.4`, pinned).

- DB file lives at `./db/app.db` (created on first run, git-ignored); override with `DATABASE_PATH`.
- Schema in `src/db/schema.ts`; migrations in `./drizzle/` (applied automatically at startup).
- After changing the schema: `npx drizzle-kit generate` (uses `drizzle.config.ts`).

## Auth

- `POST /api/login` with `{ "username": "<name or email>", "password": "<password>" }` returns `{ "token": "<JWT>", "user": { ... } }`.
- Send the token on protected requests: `Authorization: Bearer <JWT>` (stream endpoints `/api/novels/:novel/stream/:file` and `/api/chat/stream` also accept `?token=<JWT>` for native HTML5 `<audio>` and `EventSource`).
- Roles: `viewer` reads published articles; `editor` additionally views/manages draft & published articles; `admin` additionally manages users. Insufficient role → `403`.
- Bookmarks are per-user private (any logged-in user, strictly scoped to the owner).
- `src/utils/jwt.ts` implements Verify-then-Parse HS256 with `crypto.timingSafeEqual` and full claim validation.

## Audiobooks (`./mp3`)

Place audiobook folders under `./mp3/<novel-name>/<chapter>.mp3` (also supports `.m4a`, `.ogg`, `.wav`). Everything inside `./mp3/*` except `mp3/AudioBooks.txt` is git-ignored so private audiobooks are never committed.

## Static frontend resolution

`src/app.ts` serves the Angular build when present, otherwise falls back to `public/`:

1. `frontend-ngx/dist/frontend-ngx/browser/` — after building inside `frontend-ngx/`
2. `public/` — always in the repo; what a fresh clone serves before the Angular build exists

When serving the Angular build, unknown non-API `GET` routes fall back to Angular's `index.html` (SPA client-side routing).

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/` | Angular app, or `public/` fallback page when no Angular build exists |
| GET | `/health` | Health check → `{ "status": "ok" }` |
| GET | `/api` | API index, lists available endpoints |
| GET | `/api/hello` | Sample endpoint → `{ "message": "Hello, World!" }` |
| GET | `/api/setup` | `{ "needsSetup": true }` when no users exist yet (admin bootstrap) |
| POST | `/api/login` | Login with `{ username, password }` → `{ token, user }` |
| GET | `/api/articles` | Article list (`?page=&pageSize=[&status=]` → `{ items, total, page, pageSize }`). Unauthenticated & `viewer` users only see `published`; `editor+` can view `draft` |
| POST | `/api/articles` | Create article (editor+) |
| GET | `/api/articles/slug/:slug` | Read one article by slug (public for `published`, editor+ for `draft`) |
| GET/PATCH/DELETE | `/api/articles/:id` | Read / update+delete (editor+) one article |
| GET | `/api/bookmarks` | Own bookmarks, login required (`?page=&pageSize=&tag=` → `{ items, total, page, pageSize, tags }`) |
| POST | `/api/bookmarks` | Create bookmark (`{ url, title?, description?, tag? }`, `tag` defaults to `'default'`) |
| PATCH/DELETE | `/api/bookmarks/:id` | Update / delete own bookmark |
| GET | `/api/novels` | List audiobook folders under `./mp3` with chapter counts and total size (login required) |
| GET | `/api/novels/:novel` | List naturally sorted audio chapters in `./mp3/:novel` (login required) |
| GET | `/api/novels/:novel/stream/:file` | Stream audio file with HTTP Range (`206 Partial Content`) support (Bearer or `?token=`) |
| GET | `/api/chat/messages` | Snapshot of in-memory chat lobby `{ messages, onlineUsers }` (login required) |
| GET | `/api/chat/stream` | Server-Sent Events (`text/event-stream`) for real-time chat & online presence (Bearer or `?token=`) |
| POST | `/api/chat/messages` | Post a message `{ text }` to the in-memory lobby (login required) |
| DELETE | `/api/chat/messages` | Clear in-memory lobby messages (login required) |
| GET | `/api/users` | List users (admin only) |
| POST | `/api/users` | Create user (admin only, except the very first bootstrap user) |
| GET/PATCH/DELETE | `/api/users/:id` | Read / update / delete one user (admin only) |

## Project structure

```
simple-cms/
  certs/
    encode.sh           Generates local self-signed SSL cert (req.cnf, cert.key, cert.pem) for localhost & 192.168.{2,8}.*
  mp3/
    AudioBooks.txt      Placeholder; drop <novel>/<chapter>.mp3 folders here (git-ignored)
  public/               Fallback static page (served at / when no Angular build exists)
  frontend-ngx/         Angular 22 + Material 3 standalone SPA (EN + ZH via ngx-translate)
    src/app/
      app.html/app.ts/app.scss  Brand toolbar, mobile drawer, Admin menu, avatar + language menus
      pages/            home, articles, article-detail, bookmarks (+dialog), novels, novel-detail,
                        chat, login, admin, admin-articles (+dialog), admin-users (+dialog)
      services/         auth, articles, bookmarks, novels, chat, users API clients; language service
      guards/           auth (logged in), admin, editor role guards
      interceptors/     Bearer token injection for /api calls
      utils/            api-error (backend error → i18n key), markdown (XSS-safe renderer), slug
    public/assets/i18n/ en.json, zh.json runtime dictionaries
    proxy.conf.json     Dev proxy: /api, /health -> http://localhost:3000
  src/
    index.ts            Server bootstrap (starts HTTP on PORT and HTTPS on HTTPS_PORT when certs exist)
    app.ts              Express app: static hosting + router mounting
    db/
      schema.ts         Drizzle tables (articles, users, bookmarks with tag column)
      index.ts          node:sqlite connection, WAL pragmas, auto-migration
    middleware/
      requireAuth.ts    Bearer JWT check (401)
      requireRole.ts    viewer/editor/admin authorization (403)
    routes/
      api.routes.ts     Aggregates all /api/* routers
      articles.routes.ts Articles CRUD + pagination + slug lookup + draft visibility control
      bookmarks.routes.ts Private per-user bookmarks CRUD + tag filtering
      novels.routes.ts  Audiobook folder listing + chapter listing + HTTP Range audio streaming
      chat.routes.ts    In-memory family LAN chat lobby + SSE real-time stream
      users.routes.ts   Users CRUD (admin, bootstrap-open for the first user)
      auth.routes.ts    POST /api/login
      setup.routes.ts   GET /api/setup (needsSetup flag)
      hello.routes.ts   GET /api/hello
      health.routes.ts  GET /health
    utils/
      jwt.ts            Verify-then-Parse HS256 JWT on node:crypto + persisted dev secret
      password.ts       scrypt hashing + verification
  drizzle/              Committed SQLite migrations (auto-applied at startup)
  drizzle.config.ts     drizzle-kit config (schema in, ./drizzle out)
  db/                   SQLite files & .jwt-secret created at runtime (git-ignored)
  dist/                 Compiled backend output (generated by npm run build)
  tsconfig.json         Strict TS config (rootDir src, outDir dist)
```
