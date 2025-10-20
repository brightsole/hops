import resolvers from './resolvers';
import type { Hop as HopType, Word } from './types';

const { Query, Mutation, Hop } = resolvers;

const defaultHop: HopType = {
  id: 'niner',
  ownerId: 'owner',
  associations: 'rhymes',
  attemptId: 'attempt-1',
  gameId: 'game-1',
  hopKey: 'alpha::beta',
  from: 'alpha',
  to: 'beta',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const baseContextValues = {
  attemptId: 'attempt-1',
  ownerId: 'owner',
  gameId: 'game-1',
  event: { requestContext: { requestId: 'req-1' } },
};

type HopControllerMock = {
  attemptHop: jest.Mock;
  getById: jest.Mock;
  getMany: jest.Mock;
  query: jest.Mock;
  removeMany: jest.Mock;
};

const createHopControllerMock = (
  overrides: Partial<HopControllerMock> = {},
): HopControllerMock => ({
  attemptHop: jest.fn().mockRejectedValue(new Error('unexpected attemptHop')),
  getById: jest.fn().mockRejectedValue(new Error('unexpected getById')),
  getMany: jest.fn().mockRejectedValue(new Error('unexpected getMany')),
  query: jest.fn().mockRejectedValue(new Error('unexpected query')),
  removeMany: jest.fn().mockRejectedValue(new Error('unexpected removeMany')),
  ...overrides,
});

const makeWord = (name: string): Word => ({
  name,
  cacheExpiryDate: Date.now(),
  updatedAt: Date.now(),
  version: 1,
  links: [{ name: `${name}-link`, associations: [] }],
});

describe('Query', () => {
  describe('hop', () => {
    it('fetches a hop by id', async () => {
      const hopController = createHopControllerMock({
        getById: jest.fn().mockResolvedValue({ id: 'niner' }),
      });
      const context = { ...baseContextValues, hopController };

      const hop = await Query.hop(undefined, { id: 'niner' }, context);

      expect(hop).toEqual({ id: 'niner' });
      expect(hopController.getById).toHaveBeenCalledWith('niner');
    });

    it('returns undefined when no hop exists', async () => {
      const hopController = createHopControllerMock({
        getById: jest.fn().mockResolvedValue(undefined),
      });
      const context = { ...baseContextValues, hopController };

      const hop = await Query.hop(undefined, { id: 'ghost' }, context);

      expect(hop).toBeUndefined();
    });
  });

  describe('hops', () => {
    it('delegates to the controller with the provided filter', async () => {
      const results = [
        { id: 'niner', ownerId: 'owner' },
        { id: 'five', ownerId: 'owner' },
      ];
      const filter = { ownerId: 'owner', gameId: 'game-1' };
      const hopController = createHopControllerMock({
        query: jest.fn().mockResolvedValue(results),
      });
      const context = { ...baseContextValues, hopController };

      const hops = await Query.hops(undefined, { query: filter }, context);

      expect(hops).toEqual(results);
      expect(hopController.query).toHaveBeenCalledWith(filter);
    });

    it('bubbles empty results through untouched', async () => {
      const hopController = createHopControllerMock({
        query: jest.fn().mockResolvedValue([]),
      });
      const context = { ...baseContextValues, hopController };

      const hops = await Query.hops(
        undefined,
        { query: { ownerId: 'ghost' } },
        context,
      );

      expect(hops).toEqual([]);
    });
  });
});

describe('Mutation', () => {
  describe('attemptHop', () => {
    const hopInput = {
      from: makeWord('alpha'),
      to: makeWord('beta'),
      final: makeWord('gamma'),
    };

    it('invokes the controller with hop input and context metadata', async () => {
      const attemptHop = jest.fn().mockResolvedValue(defaultHop);
      const hopController = createHopControllerMock({ attemptHop });
      const context = { ...baseContextValues, hopController };

      const hop = await Mutation.attemptHop(undefined, hopInput, context);

      expect(hop).toBe(defaultHop);
      expect(attemptHop).toHaveBeenCalledWith(hopInput, baseContextValues);
    });

    it('propagates controller errors', async () => {
      const attemptHop = jest.fn().mockRejectedValue(new Error('invalid hop'));
      const hopController = createHopControllerMock({ attemptHop });
      const context = { ...baseContextValues, hopController };

      await expect(
        Mutation.attemptHop(undefined, hopInput, context),
      ).rejects.toThrow('invalid hop');
    });
  });

  describe('deleteHops', () => {
    it('removes multiple hops via the controller', async () => {
      const removeMany = jest.fn().mockResolvedValue({ ok: true });
      const hopController = createHopControllerMock({ removeMany });
      const context = { ...baseContextValues, hopController };

      const result = await Mutation.deleteHops(
        undefined,
        { ids: ['a', 'b'] },
        context,
      );

      expect(result).toEqual({ ok: true });
      expect(removeMany).toHaveBeenCalledWith(['a', 'b']);
    });

    it('propagates controller failures', async () => {
      const removeMany = jest
        .fn()
        .mockRejectedValue(new Error('delete failed'));
      const hopController = createHopControllerMock({ removeMany });
      const context = { ...baseContextValues, hopController };

      await expect(
        Mutation.deleteHops(undefined, { ids: ['a'] }, context),
      ).rejects.toThrow('delete failed');
    });
  });
});

describe('Hop federation resolver', () => {
  it('loads referenced hops by id', async () => {
    const getById = jest.fn().mockResolvedValue(defaultHop);
    const hopController = createHopControllerMock({ getById });
    const context = { ...baseContextValues, hopController };

    const hop = await Hop.__resolveReference({ id: defaultHop.id }, context);

    expect(hop).toBe(defaultHop);
    expect(getById).toHaveBeenCalledWith(defaultHop.id);
  });
});
