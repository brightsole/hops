import { createHopController } from './controller';
import { getLink } from './getLink';
import type { DBHopModel, DBLinkModel } from './types';

// Hoisted dependency mocks
jest.mock('nanoid', () => {
  let i = 0;
  return { nanoid: () => `hop-${++i}` };
});

// We'll override per-test via imported mock function
jest.mock('./getLink', () => ({
  __esModule: true,
  getLink: jest.fn(),
}));

// Mock dynamoose transaction only (we inject models ourselves)
jest.mock('dynamoose', () => ({
  __esModule: true,
  // minimal Schema stub to satisfy schema constructors
  Schema: class Schema {
    constructor(..._args: unknown[]) {}
  },
  transaction: (
    ops: Array<{ type: string; item: Record<string, unknown> }>,
  ) => ({
    exec: async () =>
      ops
        .filter((op) => op && op.type === 'create')
        .map((op) => ({
          ...op.item,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
  }),
}));

// Single-use terse model factories with jest.Mock-typed methods
type HopModelMock = {
  get: jest.Mock<Promise<unknown>, [string]>;
  batchGet: jest.Mock<Promise<unknown>, [string[]]>;
  query: jest.Mock<{ exec: jest.Mock<Promise<unknown>, []> }, [unknown]>;
  batchDelete: jest.Mock<Promise<unknown>, [string[]]>;
  create: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
};

type LinkModelMock = {
  get: jest.Mock<Promise<unknown>, [string]>;
  create: jest.Mock<Promise<unknown>, [unknown]>;
};

const createHopModel = () =>
  ({
    get: jest.fn(),
    batchGet: jest.fn(),
    query: jest.fn().mockReturnValue({ exec: jest.fn() }),
    batchDelete: jest.fn(),
    create: jest.fn(async (item: Record<string, unknown>) => ({
      ...item,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
  }) as DBHopModel & HopModelMock;

const createLinkModel = () =>
  ({
    get: jest.fn(),
    create: jest.fn(),
  }) as DBLinkModel & LinkModelMock;

// Helpers
const hop = (overrides: Record<string, unknown> = {}) => ({
  id: 'h-1',
  linkKey: 'a::b',
  associationsKey: 'assoc',
  from: 'a',
  to: 'b',
  ownerId: 'owner',
  gameId: 'game',
  attemptId: 'attempt',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const getLinkMock = getLink as jest.MockedFunction<typeof getLink>;

describe('Hop controller', () => {
  beforeEach(() => {
    getLinkMock.mockReset();
  });

  it('getById caches results on subsequent calls', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();
    const item = hop({ id: 'id-1' });

    HopModel.get.mockResolvedValue(item);

    const controller = createHopController(HopModel, LinkModel);

    const a = await controller.getById('id-1');
    const b = await controller.getById('id-1');

    expect(a).toEqual(item);
    expect(b).toEqual(item);
    expect(HopModel.get).toHaveBeenCalledTimes(1);
  });

  it('getMany delegates to batchGet', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();
    HopModel.batchGet.mockResolvedValue([hop({ id: 'm-1' })]);

    const controller = createHopController(HopModel, LinkModel);

    const res = await controller.getMany(['m-1']);
    expect(HopModel.batchGet).toHaveBeenCalledWith(['m-1']);
    expect(res).toEqual([hop({ id: 'm-1' })]);
  });

  it('query caches results', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();
    const items = [hop({ id: 'q-1' }), hop({ id: 'q-2' })];

    const execMock = jest.fn().mockResolvedValue(items);
    HopModel.query.mockReturnValue({ exec: execMock });

    const controller = createHopController(HopModel, LinkModel);

    // first query hits model
    const first = await controller.query({ ownerId: 'o-1' });
    expect(HopModel.query).toHaveBeenCalledTimes(1);
    expect(first).toEqual(items);

    // second identical query hits cache
    const second = await controller.query({ ownerId: 'o-1' });
    expect(HopModel.query).toHaveBeenCalledTimes(1);
    expect(second).toEqual(items);

    // third identical query still hits cache
    const third = await controller.query({ ownerId: 'o-1' });
    expect(HopModel.query).toHaveBeenCalledTimes(1);
    expect(third).toEqual(items);
  });

  it('attemptHop creates one hop when final is absent', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();

    getLinkMock
      .mockResolvedValueOnce({
        id: 'alpha::beta',
        associationsKey: 'a|b',
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      })
      .mockRejectedValueOnce(new Error('no final link'));

    const controller = createHopController(HopModel, LinkModel);

    const result = await controller.attemptHop(
      { from: 'alpha', to: 'beta', final: 'gamma' },
      { userId: 'u', gameId: 'g', attemptId: 'x' },
    );

    expect(getLinkMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      linkKey: 'alpha::beta',
      from: 'alpha',
      to: 'beta',
      ownerId: 'u',
      gameId: 'g',
      attemptId: 'x',
    });

    // cached by id
    const again = await createHopController(HopModel, LinkModel).getById(
      result[0].id,
    );
    expect(HopModel.get).not.toHaveBeenCalled();
    expect(again).toMatchObject({ id: result[0].id });
  });

  it('attemptHop creates two hops when final exists', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();

    getLinkMock
      .mockResolvedValueOnce({
        id: 'alpha::beta',
        associationsKey: 'a|b',
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      })
      .mockResolvedValueOnce({
        id: 'beta::gamma',
        associationsKey: 'b|g',
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      });

    const controller = createHopController(HopModel, LinkModel);

    const result = await controller.attemptHop(
      { from: 'alpha', to: 'beta', final: 'gamma' },
      { userId: 'u', gameId: 'g', attemptId: 'x' },
    );

    expect(getLinkMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      linkKey: 'alpha::beta',
      from: 'alpha',
      to: 'beta',
    });
    expect(result[1]).toMatchObject({
      linkKey: 'beta::gamma',
      from: 'beta',
      to: 'gamma',
    });
  });

  it('removeMany delegates to batchDelete and evicts cache', async () => {
    const HopModel = createHopModel();
    const LinkModel = createLinkModel();
    const item = hop({ id: 'rm-1' });

    HopModel.get.mockResolvedValue(item);
    const controller = createHopController(HopModel, LinkModel);
    await controller.getById('rm-1'); // populate cache

    await controller.removeMany(['rm-1']);

    expect(HopModel.batchDelete).toHaveBeenCalledWith(['rm-1']);
    // next call will miss cache and hit model.get again
    await controller.getById('rm-1');
    expect(HopModel.get).toHaveBeenCalledTimes(2);
  });
});
