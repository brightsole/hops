import serverlessExpress from '@vendia/serverless-express';
import express, { Request } from 'express';
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

  app.post('/hops', async (req, res) => {
    const { from, to } = req.body;

    // Extract user context from headers
    const userId = req.headers['x-user-id'] as string;
    const gameId = req.headers['x-game-id'] as string;
    const attemptId = req.headers['x-attempt-id'] as string;

    if (!userId || !gameId || !attemptId) {
      throw new Error('Missing required headers');
    }

    try {
      const hop = await hopsController.attemptHop(
        { from, to },
        { userId, gameId, attemptId },
      );
      res.status(201).json(hop);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create hop',
      });
    }
  });

  // technically we don't care about the response, other than errors
  app.post('/hops/linked', async (req, res) => {
    const { from, to } = req.body;
    try {
      const linkedResults = await hopsController.testLink(from, to);
      res.json(linkedResults);
    } catch {
      res.status(404).json({ error: 'No link found' });
    }
  });

  app.delete(
    '/hops',
    async (
      req: Request<unknown, unknown, unknown, { attemptId: string }>,
      res,
    ) => {
      const { attemptId } = req.query;

      if (!attemptId) {
        res
          .status(400)
          .json({ error: 'attemptId query parameter is required' });
        return;
      }

      try {
        const hops = await hopsController.query({ attemptId });
        const hopIds = hops.map((hop) => hop.id);

        if (hopIds.length === 0) {
          res.json({ ok: true, deleted: 0 });
          return;
        }

        const result = await hopsController.removeMany(hopIds);
        res.json({ ...result, deleted: hopIds.length });
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'Failed to delete hops',
        });
      }
    },
  );

  return app;
};

export const handler = serverlessExpress({ app: createRestApp() });
