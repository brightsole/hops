import type { Word, ModelType, HopQuery } from './types';
import { createHopController } from './controller';
import { getAssociations } from './getAssociations';

const transactionExecMock = jest.fn();

jest.mock('dynamoose', () => {
  const transaction = jest.fn();
  const model = jest.fn();
  const Schema = jest.fn().mockImplementation(() => ({}));

  return {
    transaction,
    model,
    Schema,
  };
});

jest.mock('./getAssociations');

const {
  transaction: mockTransaction,
  model: _mockModel,
  Schema: _mockSchema,
} = jest.requireMock('dynamoose') as {
  transaction: jest.Mock;
  model: jest.Mock;
  Schema: jest.Mock;
};

const getAssociationsMock = getAssociations as jest.MockedFunction<
  typeof getAssociations
>;

const createWord = (name: string): Word => ({
  name,
  links: [],
  cacheExpiryDate: 0,
  updatedAt: 0,
  version: 1,
});

type HopModelMock = {
  get: jest.Mock;
  batchGet: jest.Mock;
  batchDelete: jest.Mock;
  query: jest.Mock;
  transaction: { create: jest.Mock };
};

const createHopModelMock = (
  overrides: Partial<HopModelMock> = {},
): HopModelMock => ({
  get: jest.fn(),
  batchGet: jest.fn(),
  batchDelete: jest.fn(),
  query: jest.fn().mockReturnValue({ exec: jest.fn() }),
  transaction: { create: jest.fn() },
  ...overrides,
});

const buildController = (model: HopModelMock) =>
  createHopController(model as unknown as ModelType);

describe('createHopController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionExecMock.mockReset();
    mockTransaction.mockReset();
    mockTransaction.mockImplementation(() => ({ exec: transactionExecMock }));
    getAssociationsMock.mockReset();
  });

  describe('attemptHop', () => {
    const meta = {
      ownerId: 'owner-1',
      gameId: 'game-1',
      attemptId: 'attempt-1',
    };

    it('runs both hop creations in a single transaction when the final hop links back', async () => {
      const hopModel = createHopModelMock({
        transaction: {
          create: jest.fn((payload) => ({ action: 'create', payload })),
        },
      });
      const controller = buildController(hopModel);
      const from = createWord('alpha');
      const to = createWord('beta');
      const final = createWord('gamma');

      getAssociationsMock.mockReturnValueOnce('alpha-beta');
      getAssociationsMock.mockReturnValueOnce('beta-gamma');
      transactionExecMock.mockResolvedValue(['hop-primary', 'hop-final']);

      const result = await controller.attemptHop({ from, to, final }, meta);

      expect(result).toEqual(['hop-primary', 'hop-final']);
      expect(getAssociationsMock).toHaveBeenNthCalledWith(1, from, to);
      expect(getAssociationsMock).toHaveBeenNthCalledWith(2, to, final);
      expect(hopModel.transaction.create).toHaveBeenCalledTimes(2);
      expect(hopModel.transaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          hopKey: 'alpha::beta',
          associations: 'alpha-beta',
          from: 'alpha',
          to: 'beta',
          ownerId: meta.ownerId,
        }),
      );
      expect(hopModel.transaction.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          hopKey: 'beta::gamma',
          associations: 'beta-gamma',
          from: 'beta',
          to: 'gamma',
          ownerId: meta.ownerId,
        }),
      );
      expect(mockTransaction).toHaveBeenCalledWith([
        {
          action: 'create',
          payload: expect.objectContaining({ hopKey: 'alpha::beta' }),
        },
        {
          action: 'create',
          payload: expect.objectContaining({ hopKey: 'beta::gamma' }),
        },
      ]);
      expect(transactionExecMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to a single hop when the final association is missing', async () => {
      const hopModel = createHopModelMock({
        transaction: {
          create: jest.fn((payload) => ({ action: 'create', payload })),
        },
      });
      const controller = buildController(hopModel);
      const from = createWord('alpha');
      const to = createWord('beta');
      const final = createWord('gamma');

      getAssociationsMock.mockReturnValueOnce('alpha-beta');
      getAssociationsMock.mockImplementationOnce(() => {
        throw new Error('Not linked');
      });
      transactionExecMock.mockResolvedValue(['hop-primary']);

      const result = await controller.attemptHop({ from, to, final }, meta);

      expect(result).toEqual(['hop-primary']);
      expect(hopModel.transaction.create).toHaveBeenCalledTimes(1);
      expect(hopModel.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ hopKey: 'alpha::beta' }),
      );
      expect(mockTransaction).toHaveBeenCalledWith([
        {
          action: 'create',
          payload: expect.objectContaining({ hopKey: 'alpha::beta' }),
        },
      ]);
    });
  });

  it('passes through getById', async () => {
    const hopModel = createHopModelMock({
      get: jest.fn().mockResolvedValue('hop'),
    });

    const result = await buildController(hopModel).getById('hop-id');

    expect(result).toBe('hop');
    expect(hopModel.get).toHaveBeenCalledWith('hop-id');
  });

  it('passes through getMany', async () => {
    const hopModel = createHopModelMock({
      batchGet: jest.fn().mockResolvedValue(['hop-1', 'hop-2']),
    });

    const result = await buildController(hopModel).getMany(['hop-1', 'hop-2']);

    expect(result).toEqual(['hop-1', 'hop-2']);
    expect(hopModel.batchGet).toHaveBeenCalledWith(['hop-1', 'hop-2']);
  });

  it('proxies query to the model query', async () => {
    const exec = jest.fn().mockResolvedValue(['hop']);
    const hopModel = createHopModelMock({
      query: jest.fn().mockReturnValue({ exec }),
    });

    const query = {
      ownerId: 'owner-1',
      associations: 'rhymes',
    } as unknown as HopQuery;

    const result = await buildController(hopModel).query(query);

    expect(hopModel.query).toHaveBeenCalledWith({
      ownerId: { eq: 'owner-1' },
      associations: { contains: 'rhymes' },
    });
    expect(result).toEqual(['hop']);
  });

  it('calls batchDelete during removeMany', async () => {
    const hopModel = createHopModelMock({
      batchDelete: jest.fn().mockResolvedValue(undefined),
    });

    const result = await buildController(hopModel).removeMany([
      'hop-1',
      'hop-2',
    ]);

    expect(result).toEqual({ ok: true });
    expect(hopModel.batchDelete).toHaveBeenCalledWith(['hop-1', 'hop-2']);
  });
});
