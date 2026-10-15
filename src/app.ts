import express, { type Application, type Request, type Response } from 'express';
import path from 'node:path';
import apiRouter from './routes/api.routes.js';
import healthRouter from './routes/health.routes.js';

const app: Application = express();

const publicPath: string = path.join(__dirname, '..', 'public');

app.use(express.json());

// Root route -> static frontend in /public
app.use(express.static(publicPath));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Routers — APIs live in separate files under src/routes/
// To add a new resource: create src/routes/<name>.routes.ts,
// then mount it in src/routes/api.routes.ts with apiRouter.use('/<name>', ...)
app.use('/health', healthRouter);
app.use('/api', apiRouter);

export default app;
