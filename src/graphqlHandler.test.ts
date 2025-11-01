import { gql } from 'graphql-tag';
import getGraphqlServer from '../test/getGraphqlServer';
import { startController } from './controller';

// INTEGRATION TEST OF THE FULL PATH
// only test for completion of high level access
// correct low level unit testing should be done on the resolver/util level

// Mock only the external fetch to Words service and the DB layer via dynamoose
jest.mock('./env', () => ({
  __esModule: true,
  default: { wordsApiUrl: 'http://words.example.test' },
}));

let mockLinks: Record<string, Record<string, unknown>> = {};
let mockHops: Array<{ id?: string; [k: string]: unknown }> = [];
let mockModelCall = 0;
const fetchMock = jest.spyOn(global, 'fetch');

const resetMockStores = () => {
  mockLinks = {};
  mockHops = [];
  mockModelCall = 0;
};

// TODO: redo this insane garbage
// AI made fucking mincemeat of simple mocks
jest.mock('dynamoose', () => {
  const createModel = (kind: 'hop' | 'link') => ({
    get: jest.fn(async (id: string) => {
      if (kind === 'hop') return mockHops.find((h) => h.id === id);
      const found = mockLinks[id];
      if (!found) throw new Error('not found');
      return found;
    }),
    create: jest.fn(async (item: Record<string, unknown>) => {
      if (kind === 'hop') {
        // not usually called directly in our flow, but keep behavior consistent
        mockHops.push({
          ...item,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return item;
      }
      mockLinks[item.id as string] = item;
      return item;
    }),
    batchGet: jest.fn(async (ids: string[]) =>
      kind === 'hop' ? mockHops.filter((h) => ids.includes(String(h.id))) : [],
    ),
    query: jest.fn(() => ({
      exec: jest.fn(async () => (kind === 'hop' ? mockHops : [])),
    })),
    batchDelete: jest.fn(async (ids: string[]) => {
      if (kind !== 'hop') return;
      ids.forEach((id) => {
        const idx = mockHops.findIndex((h) => h.id === id);
        if (idx >= 0) mockHops.splice(idx, 1);
      });
    }),
    transaction: { create: (item: unknown) => ({ type: 'create', item }) },
  });

  return {
    __esModule: true,
    // minimal Schema stub to satisfy schema imports
    Schema: class Schema {},
    model: () => {
      mockModelCall += 1;
      return createModel(mockModelCall === 1 ? 'hop' : 'link');
    },
    transaction: (
      ops: Array<{ type: string; item: Record<string, unknown> }>,
    ) => ({
      exec: async () => {
        const created = ops
          .filter((op) => op && op.type === 'create')
          .map((op) => op.item);
        created.forEach((h) =>
          mockHops.push({
            ...h,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        );
        return created;
      },
    }),
  };
});

describe('Resolver full path', () => {
  beforeEach(() => {
    resetMockStores();
    fetchMock.mockReset();
  });

  it('queries hops by gameId without error', async () => {
    const server = getGraphqlServer();

    // Pre-populate mock hops with different gameIds
    mockHops.push(
      {
        id: 'hop-1',
        from: 'alpha',
        to: 'beta',
        linkKey: 'alpha::beta',
        ownerId: 'owner-1',
        gameId: 'game-1',
        attemptId: 'attempt-1',
        associationsKey: 'test-association',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'hop-2',
        from: 'beta',
        to: 'gamma',
        linkKey: 'beta::gamma',
        ownerId: 'owner-1',
        gameId: 'game-1',
        attemptId: 'attempt-1',
        associationsKey: 'test-association-2',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'hop-3',
        from: 'delta',
        to: 'epsilon',
        linkKey: 'delta::epsilon',
        ownerId: 'owner-2',
        gameId: 'game-2',
        attemptId: 'attempt-2',
        associationsKey: 'test-association-3',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    );

    const hopsQuery = gql`
      query GetHops($query: HopQueryInput!) {
        hops(query: $query) {
          id
          from
          to
          linkKey
          ownerId
          gameId
          attemptId
        }
      }
    `;

    const userInfo = {
      ownerId: 'owner-1',
      gameId: 'game-1',
      attemptId: 'attempt-1',
    };

    const queryInput = {
      gameId: 'game-1',
    };

    const response = await server.executeOperation(
      {
        query: hopsQuery,
        variables: { query: queryInput },
      },
      {
        contextValue: {
          hopController: startController(),
          ...userInfo,
        },
      },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data).toBeDefined();

      const hops = response.body.singleResult.data?.hops as Array<{
        id: string;
        from: string;
        to: string;
        gameId: string;
      }>;
      expect(hops).toHaveLength(3); // Mock returns all hops (not filtered)
      expect(hops[0]).toMatchObject({
        id: 'hop-1',
        from: 'alpha',
        to: 'beta',
        gameId: 'game-1',
      });
      expect(hops[1]).toMatchObject({
        id: 'hop-2',
        from: 'beta',
        to: 'gamma',
        gameId: 'game-1',
      });
      expect(hops[2]).toMatchObject({
        id: 'hop-3',
        from: 'delta',
        to: 'epsilon',
        gameId: 'game-2',
      });
    }
  });

  it('queries a single hop by id without error', async () => {
    const server = getGraphqlServer();

    // Pre-populate mock hops
    mockHops.push({
      id: 'hop-1',
      from: 'alpha',
      to: 'beta',
      linkKey: 'alpha::beta',
      ownerId: 'owner-1',
      gameId: 'game-1',
      attemptId: 'attempt-1',
      associationsKey: 'test-association',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const hopQuery = gql`
      query GetHop($id: ID!) {
        hop(id: $id) {
          id
          from
          to
          linkKey
          ownerId
          gameId
        }
      }
    `;

    const response = await server.executeOperation(
      {
        query: hopQuery,
        variables: { id: 'hop-1' },
      },
      {
        contextValue: {
          hopController: startController(),
        },
      },
    );

    expect(response.body.kind).toBe('single');
    if (response.body.kind === 'single') {
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data?.hop).toMatchObject({
        id: 'hop-1',
        from: 'alpha',
        to: 'beta',
        gameId: 'game-1',
      });
    }
  });
});
