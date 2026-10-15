import { Router, type Request, type Response } from 'express';

const healthRouter: Router = Router();

// GET /health
healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default healthRouter;
