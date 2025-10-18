import http from 'node:http';
import { nanoid } from 'nanoid';
import { startController } from './itemController';
import { createRestApp } from './restHandler';

jest.mock('./itemController', () => ({
  startController: jest.fn(),
}));

const mockStartController = jest.mocked(startController);

const createControllerDouble = (
  overrides: Partial<ReturnType<typeof startController>>,
): ReturnType<typeof startController> => ({
  create: jest.fn().mockRejectedValue('unexpected create'),
  getById: jest.fn().mockRejectedValue('unexpected getById'),
  listByOwner: jest.fn().mockRejectedValue('unexpected listByOwner'),
  update: jest.fn().mockRejectedValue('unexpected update'),
  remove: jest.fn().mockRejectedValue('unexpected remove'),
  ...overrides,
});

describe('REST handler', () => {
  it('creates an item without error', async () => {
    const create = jest.fn().mockResolvedValue({
      id: nanoid(),
      name: 'threeve',
      description: 'A combination of three and five; simply stunning',
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockStartController.mockReturnValue(createControllerDouble({ create }));

    const app = createRestApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));

    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string')
      throw new Error('Server failed to start');

    const payload = JSON.stringify({
      name: 'threeve',
      description: 'A combination of three and five; simply stunning',
    });

    try {
      const response = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: serverAddress.port,
              path: '/items',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                id: 'owner-1',
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
          req.write(payload);
          req.end();
        },
      );

      expect(response.status).toBe(201);

      const data = JSON.parse(response.body);
      expect(data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'threeve',
          description: 'A combination of three and five; simply stunning',
          ownerId: 'owner-1',
        }),
      );
      expect(create).toHaveBeenCalledWith(
        {
          name: 'threeve',
          description: 'A combination of three and five; simply stunning',
        },
        'owner-1',
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
