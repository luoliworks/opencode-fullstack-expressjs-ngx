import { Router, type Request, type Response } from 'express';

const helloRouter: Router = Router();

// GET /api/hello
helloRouter.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Hello, World!' });
});

export default helloRouter;
