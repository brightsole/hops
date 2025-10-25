import type { GraphQLResolveInfo } from 'graphql';
import resolvers from './resolvers';
import type { Context } from './types';
import type { Resolver } from './generated/graphql';
import type { createHopController } from './controller';

// Typed controller mock
type HopControllerMock = jest.Mocked<ReturnType<typeof createHopController>>;

const mockHopControllerFactory = jest.fn(
  (overrides: Partial<HopControllerMock> = {}): HopControllerMock =>
    ({
      getById: jest.fn(),
      getMany: jest.fn(),
      query: jest.fn(),
      attemptHop: jest.fn(),
      removeMany: jest.fn(),
      ...overrides,
    }) as unknown as HopControllerMock,
);

const buildHopController = (
  overrides: Partial<HopControllerMock> = {},
): HopControllerMock => mockHopControllerFactory(overrides);

type ContextOverrides = Partial<Omit<Context, 'hopController'>> & {
  hopController?: HopControllerMock;
};

const buildContext = (overrides: ContextOverrides = {}): Context => {
  const { hopController = buildHopController(), ...rest } = overrides;

  return {
    event: {},
    hopController,
    userId: 'user-1',
    gameId: 'game-1',
    attemptId: 'attempt-1',
    ...rest,
  } as Context;
};

const ensureResolver = <Result, Parent, Args>(
  resolver: Resolver<Result, Parent, Context, Args> | undefined,
  key: string,
): Resolver<Result, Parent, Context, Args> => {
  if (!resolver) throw new Error(`${key} resolver is not implemented`);
  return resolver;
};

const callResolver = async <Result, Parent, Args>(
  resolver: Resolver<Result, Parent, Context, Args> | undefined,
  parent: Parent,
  args: Args,
  context: Context,
  key: string,
) => {
  const info = {} as GraphQLResolveInfo;
  const resolved = ensureResolver(resolver, key);
  if (typeof resolved === 'function')
    return resolved(parent, args, context, info);
  return resolved.resolve(parent, args, context, info);
};

describe('Resolvers', () => {
  const Query = resolvers.Query!;
  const Mutation = resolvers.Mutation!;
  const Hop = resolvers.Hop!;

  describe('Query.hop', () => {
    it('delegates to hopController.getById', async () => {
      const hopController = buildHopController({
        getById: jest.fn().mockResolvedValue({ id: 'h-1' }),
      });

      const result = await callResolver(
        Query.hop,
        {},
        { id: 'h-1' },
        buildContext({ hopController }),
        'Query.hop',
      );

      expect(hopController.getById).toHaveBeenCalledWith('h-1');
      expect(result).toEqual({ id: 'h-1' });
    });
  });

  describe('Query.hops', () => {
    it('delegates to hopController.query', async () => {
      const hopController = buildHopController({
        query: jest.fn().mockResolvedValue([{ id: 'h-1' }]),
      });

      const result = await callResolver(
        Query.hops,
        {},
        { query: { ownerId: 'owner-1' } },
        buildContext({ hopController }),
        'Query.hops',
      );

      expect(hopController.query).toHaveBeenCalledWith({ ownerId: 'owner-1' });
      expect(result).toEqual([{ id: 'h-1' }]);
    });
  });

  describe('Mutation.attemptHop', () => {
    it('delegates to hopController.attemptHop with user context', async () => {
      const hopController = buildHopController({
        attemptHop: jest.fn().mockResolvedValue([{ id: 'h-1' }]),
      });

      const ctx = buildContext({
        hopController,
        userId: 'u-1',
        gameId: 'g-1',
        attemptId: 'a-1',
      });

      const result = await callResolver(
        Mutation.attemptHop,
        {},
        { from: 'alpha', to: 'beta', final: 'gamma' },
        ctx,
        'Mutation.attemptHop',
      );

      expect(hopController.attemptHop).toHaveBeenCalledWith(
        { from: 'alpha', to: 'beta', final: 'gamma' },
        { userId: 'u-1', gameId: 'g-1', attemptId: 'a-1' },
      );
      expect(result).toEqual([{ id: 'h-1' }]);
    });
  });

  describe('Mutation.deleteHops', () => {
    it('delegates to hopController.removeMany', async () => {
      const hopController = buildHopController({
        removeMany: jest.fn().mockResolvedValue({ ok: true }),
      });

      const result = await callResolver(
        Mutation.deleteHops,
        {},
        { ids: ['x', 'y'] },
        buildContext({ hopController }),
        'Mutation.deleteHops',
      );

      expect(hopController.removeMany).toHaveBeenCalledWith(['x', 'y']);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('Hop.__resolveReference', () => {
    it('delegates to hopController.getById', async () => {
      const hopController = buildHopController({
        getById: jest.fn().mockResolvedValue({ id: 'h-9' }),
      });

      // __resolveReference has a slightly different signature; call directly
      const result = await Hop.__resolveReference?.(
        { id: 'h-9' } as never,
        buildContext({ hopController }),
        {} as GraphQLResolveInfo,
      );

      expect(hopController.getById).toHaveBeenCalledWith('h-9');
      expect(result).toEqual({ id: 'h-9' });
    });
  });
});
