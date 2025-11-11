import http from 'node:http';
import { nanoid } from 'nanoid';
import { startController } from './controller';
import { createRestApp } from './restHandler';
import env from './env';

jest.mock('./controller', () => ({
  startController: jest.fn(),
}));

const mockStartController = jest.mocked(startController);

const createControllerDouble = (
  overrides: Partial<ReturnType<typeof startController>>,
): ReturnType<typeof startController> => ({
  attemptHop: jest.fn().mockRejectedValue('unexpected attemptHop'),
  getById: jest.fn().mockRejectedValue('unexpected getById'),
  query: jest.fn().mockRejectedValue('unexpected query'),
  getMany: jest.fn().mockRejectedValue('unexpected getMany'),
  removeMany: jest.fn().mockRejectedValue('unexpected removeMany'),
  testLink: jest.fn().mockRejectedValue('unexpected testLink'),
  ...overrides,
});

describe('REST handler', () => {
  it('gets an item without error', async () => {
    const getById = jest.fn().mockResolvedValue({
      id: nanoid(),
      name: 'threeve',
      description: 'A combination of three and five; simply stunning',
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockStartController.mockReturnValue(createControllerDouble({ getById }));

    const app = createRestApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));

    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string')
      throw new Error('Server failed to start');

    try {
      const response = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: serverAddress.port,
              path: '/hops/threeve',
              method: 'GET',
              headers: {
                id: 'owner-1',
                [env.authHeaderName]: env.authHeaderValue,
              },
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk) => chunks.push(chunk as Buffer));
              res.on('end', () =>
                resolve({
                  status: res.statusCode ?? 0,
                  body: Buffer.concat(chunks).toString('utf-8'),
                }),
              );
            },
          );

          req.on('error', reject);
          req.end();
        },
      );

      expect(response.status).toBe(200);

      const data = JSON.parse(response.body);
      expect(data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'threeve',
          description: 'A combination of three and five; simply stunning',
          ownerId: 'owner-1',
        }),
      );
      expect(getById).toHaveBeenCalledWith('threeve');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it('deletes hops by attemptId', async () => {
    const hopId1 = nanoid();
    const hopId2 = nanoid();
    const attemptId = 'attempt-123';

    const query = jest.fn().mockResolvedValue([
      {
        id: hopId1,
        from: 'alpha',
        to: 'beta',
        attemptId,
        ownerId: 'owner-1',
        gameId: 'game-1',
        linkKey: 'alpha::beta',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: hopId2,
        from: 'beta',
        to: 'gamma',
        attemptId,
        ownerId: 'owner-1',
        gameId: 'game-1',
        linkKey: 'beta::gamma',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    const removeMany = jest.fn().mockResolvedValue({ ok: true });

    mockStartController.mockReturnValue(
      createControllerDouble({ query, removeMany }),
    );

    const app = createRestApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));

    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string')
      throw new Error('Server failed to start');

    try {
      const response = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: serverAddress.port,
              path: `/hops?attemptId=${attemptId}`,
              method: 'DELETE',
              headers: {
                [env.authHeaderName]: env.authHeaderValue,
              },
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk) => chunks.push(chunk as Buffer));
              res.on('end', () =>
                resolve({
                  status: res.statusCode ?? 0,
                  body: Buffer.concat(chunks).toString('utf-8'),
                }),
              );
            },
          );

          req.on('error', reject);
          req.end();
        },
      );

      expect(response.status).toBe(200);

      const data = JSON.parse(response.body);
      expect(data).toEqual({ ok: true, deleted: 2 });

      expect(query).toHaveBeenCalledWith({ attemptId });
      expect(removeMany).toHaveBeenCalledWith([hopId1, hopId2]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
