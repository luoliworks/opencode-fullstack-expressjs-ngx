import { Router, type Request, type Response } from 'express';
import articlesRouter from './articles.routes.js';
import helloRouter from './hello.routes.js';
import usersRouter from './users.routes.js';

const apiRouter: Router = Router();

// GET /api
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API root',
    endpoints: ['/api/hello', '/api/articles', '/api/users'],
  });
});

// Mount feature routers here — one line per resource:
// GET /api/hello
apiRouter.use('/hello', helloRouter);
// Articles CRUD: GET|POST /api/articles, GET|PATCH|DELETE /api/articles/:id
apiRouter.use('/articles', articlesRouter);
// Users CRUD: GET|POST /api/users, GET|PATCH|DELETE /api/users/:id
apiRouter.use('/users', usersRouter);
// Example for the future:
// apiRouter.use('/users', usersRouter);

export default apiRouter;
