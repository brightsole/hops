import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import { startController } from './itemController';

export const createRestApp = () => {
  const app = express();
  const itemController = startController();

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

  app.get('/items/:id', async (req, res) => {
    const item = await itemController.getById(req.params.id);
    res.json(item);
  });

  app.get('/items', async (req, res) => {
    const ownerId = req.query.ownerId || req.header('id');

    const items = await itemController.listByOwner(ownerId as string);
    res.json(items);
  });

  app.post('/items', async (req, res) => {
    const item = await itemController.create(req.body, req.header('id'));
    res.status(201).json(item);
  });

  app.put('/items/:id', async (req, res) => {
    const item = await itemController.update(
      { id: req.params.id, ...req.body },
      req.header('id'),
    );

    res.json(item);
  });

  app.delete('/items/:id', async (req, res) => {
    const result = await itemController.remove(req.params.id, req.header('id'));
    res.json(result);
  });

  return app;
};

export const handler = serverlessExpress({ app: createRestApp() });
