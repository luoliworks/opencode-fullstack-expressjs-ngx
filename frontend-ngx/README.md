# Simple CMS — frontend-ngx

Angular 22 + Material frontend for Simple CMS (see the repo-root `README.md` for the full picture: backend API, auth, database, routes).

## Commands (run inside `frontend-ngx/`)

```cmd
npm install
npm run dev      :: ng serve on :4200, /api + /health proxied to :3000 (proxy.conf.json)
npm run build    :: production build into dist/frontend-ngx (served by Express in prod)
```

## App map

- `src/app/app.*` — brand toolbar (responsive hamburger under 720px), Manage dropdown, avatar + language menus
- `src/app/pages/` — `home` (project info), `articles` (public list), `article-detail`, `bookmarks` + dialog (login required, self-managed), `login`, `admin`, `admin-articles` + dialog (editor+), `admin-users` + dialog (admin)
- `src/app/services/` — `auth`, `articles`, `bookmarks`, `users` API clients; `language` (runtime language + persistence)
- `src/app/guards/`, `src/app/interceptors/` — role guards, Bearer token injection
- `src/app/utils/` — `api-error` (backend English errors → i18n keys), `slug`

## i18n

Runtime dictionaries in `public/assets/i18n/` (`en.json` default, `zh.json`). To add a language: add `<lang>.json` and register it in `src/app/services/language.service.ts`. Backend error strings map to keys in `src/app/utils/api-error.ts` — unknown errors pass through in English.
