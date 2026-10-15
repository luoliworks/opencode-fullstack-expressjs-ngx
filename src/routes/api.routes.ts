import { Router, type Request, type Response } from 'express';
import articlesRouter from './articles.routes.js';
import helloRouter from './hello.routes.js';

const apiRouter: Router = Router();

// GET /api
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API root',
    endpoints: ['/api/hello', '/api/articles'],
  });
});

// Mount feature routers here — one line per resource:
// GET /api/hello
apiRouter.use('/hello', helloRouter);
// Articles CRUD: GET|POST /api/articles, GET|PATCH|DELETE /api/articles/:id
apiRouter.use('/articles', articlesRouter);
// Example for the future:
// apiRouter.use('/users', usersRouter);

export default apiRouter;
