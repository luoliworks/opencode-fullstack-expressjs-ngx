import { Router, type Request, type Response } from 'express';
import helloRouter from './hello.routes.js';

const apiRouter: Router = Router();

// GET /api
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API root',
    endpoints: ['/api/hello'],
  });
});

// Mount feature routers here — one line per resource:
// GET /api/hello
apiRouter.use('/hello', helloRouter);
// Example for the future:
// apiRouter.use('/users', usersRouter);

export default apiRouter;
