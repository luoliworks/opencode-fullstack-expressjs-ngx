import { Router, type Request, type Response } from 'express';
import articlesRouter from './articles.routes.js';
import authRouter from './auth.routes.js';
import bookmarksRouter from './bookmarks.routes.js';
import helloRouter from './hello.routes.js';
import setupRouter from './setup.routes.js';
import usersRouter from './users.routes.js';

const apiRouter: Router = Router();

// GET /api
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API root',
    endpoints: ['/api/hello', '/api/login', '/api/setup', '/api/articles', '/api/bookmarks', '/api/users'],
  });
});

// POST /api/login  { username, password } -> { token, user }
apiRouter.use('/login', authRouter);
// GET /api/setup  -> { needsSetup: boolean }
apiRouter.use('/setup', setupRouter);
// GET /api/hello
apiRouter.use('/hello', helloRouter);
// Articles CRUD: GET|POST /api/articles, GET|PATCH|DELETE /api/articles/:id
apiRouter.use('/articles', articlesRouter);
// Bookmarks CRUD (login required, strictly per-user):
// GET|POST /api/bookmarks, PATCH|DELETE /api/bookmarks/:id
apiRouter.use('/bookmarks', bookmarksRouter);
// Users CRUD: GET|POST /api/users, GET|PATCH|DELETE /api/users/:id
apiRouter.use('/users', usersRouter);
// Example for the future:
// apiRouter.use('/users', usersRouter);

export default apiRouter;
