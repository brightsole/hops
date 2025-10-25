import { gql } from 'graphql-tag';
import getGraphqlServer from '../test/getGraphqlServer';
import { startController } from './controller';
import type { Word } from './types';
import type { MutationAttemptHopArgs } from './generated/graphql';

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

  it('attempts a hop without error', async () => {
    const server = getGraphqlServer();

    const attemptHopMutation = gql`
      mutation AttemptHop($from: ID!, $to: ID!, $final: ID!) {
        attemptHop(from: $from, to: $to, final: $final) {
          id
          from
          to
          linkKey
          ownerId
          gameId
        }
      }
    `;

    const userInfo = {
      ownerId: 'owner-1',
      gameId: 'game-1',
      attemptId: 'attempt-1',
    };

    const input: MutationAttemptHopArgs = {
      from: 'alpha',
      to: 'beta',
      final: 'gamma',
    };

    // Mock words API responses for alpha/beta/gamma
    const word = (name: string, linksArr: Word['links'] = []): Word => ({
      name,
      links: linksArr,
      cacheExpiryDate: 0,
      updatedAt: 0,
      version: 1,
    });
    const words: Record<string, Word> = {
      alpha: word('alpha', [
        { name: 'beta', associations: [{ type: 'Datamuse: associated with' }] },
      ]),
      beta: word('beta', [
        {
          name: 'alpha',
          associations: [{ type: 'Datamuse: associated with' }],
        },
      ]),
      // gamma not linked to beta to exercise optional final path
      gamma: word('gamma', []),
    };
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = typeof input === 'string' ? input : String(input);
      const name = url.split('/').pop() as string;
      const payload = words[name];
      return new Response(JSON.stringify(payload));
    });

    // Now that dynamoose is mocked, construct the controller
    const hopController = startController();

    const { body } = await server.executeOperation(
      {
        query: attemptHopMutation,
        variables: input,
      },
      {
        contextValue: {
          hopController,
          userId: userInfo.ownerId,
          gameId: userInfo.gameId,
          attemptId: userInfo.attemptId,
          event: {
            headers: {
              'x-user-id': userInfo.ownerId,
              'x-game-id': userInfo.gameId,
              'x-attempt-id': userInfo.attemptId,
            },
            requestContext: { requestId: 'req-1' },
          },
        },
      },
    );

    if (body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }

    const { singleResult } = body;

    expect(singleResult.errors).toBeUndefined();
    expect(singleResult.data).toEqual({
      attemptHop: [
        {
          id: expect.any(String),
          from: input.from,
          to: input.to,
          linkKey: `${input.from}::${input.to}`,
          ownerId: userInfo.ownerId,
          gameId: userInfo.gameId,
        },
      ],
    });
    // Verify link was created in our in-memory store and words were fetched
    expect(Object.keys(mockLinks)).toContain('alpha::beta');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
