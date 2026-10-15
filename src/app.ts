import express, { type Application, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import apiRouter from './routes/api.routes.js';
import healthRouter from './routes/health.routes.js';

const app: Application = express();

// Angular production build output:
// <repo-root>/frontend-ngx/dist/frontend-ngx/browser/index.html
// Resolves correctly both under tsx (from src/) and compiled output (from dist/).
const angularDistPath: string = path.join(
  __dirname,
  '..',
  'frontend-ngx',
  'dist',
  'frontend-ngx',
  'browser',
);

// Legacy static frontend in /public — always present in the repo.
const publicPath: string = path.join(__dirname, '..', 'public');

// Prefer the Angular build when it exists; otherwise fall back to /public
// (e.g. fresh clone before `npm run build` inside frontend-ngx/).
const angularIndex: string = path.join(angularDistPath, 'index.html');
const usingAngular: boolean = fs.existsSync(angularIndex);
const staticPath: string = usingAngular ? angularDistPath : publicPath;

console.log(`Serving static frontend from: ${staticPath}`);

app.use(express.json());

app.use(express.static(staticPath));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Routers — APIs live in separate files under src/routes/
// To add a new resource: create src/routes/<name>.routes.ts,
// then mount it in src/routes/api.routes.ts with apiRouter.use('/<name>', ...)
app.use('/health', healthRouter);
app.use('/api', apiRouter);

// SPA fallback for Angular client-side routes — only when serving the Angular
// build (/public keeps its exact legacy behavior). Placed after the API
// routers so /api/* and /health are never shadowed.
if (usingAngular) {
  app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(angularIndex);
  });
}

export default app;
