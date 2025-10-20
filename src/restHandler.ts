import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { startController } from './controller';

export const createRestApp = () => {
  const app = express();
  const hopsController = startController();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use(express.json());

  app.get('/hops/:id', async (req, res) => {
    const hop = await hopsController.getById(req.params.id);
    res.json(hop);
  });

  app.get('/hops', async (req, res) => {
    // get many by ids is more of a gql use case
    const hops = await hopsController.query(req.query);
    res.json(hops);
  });

  app.delete('/hops', async (req, res) => {
    if (
      !Array.isArray(req.query.ids) ||
      req.query.ids.some((id) => typeof id !== 'string')
    ) {
      res.status(400).json({ error: 'ids query parameter must be an array' });
      return;
    }
    const result = await hopsController.removeMany(req.query.ids as string[]);
    res.json(result);
  });

  return app;
};

export const handler = serverlessExpress({ app: createRestApp() });
