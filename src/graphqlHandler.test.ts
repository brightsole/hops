import { gql } from 'graphql-tag';
import { nanoid } from 'nanoid';
import getGraphqlServer from '../test/getGraphqlServer';

// INTEGRATION TEST OF THE FULL PATH
// only test for completion of high level access
// correct low level unit testing should be done on the resolver/util level

describe('Resolver full path', () => {
  it('attempts a hop without error', async () => {
    const server = getGraphqlServer();

    const attemptHopMutation = gql`
      mutation AttemptHop($input: AttemptHopInput!, $userInfo: UserInfo!) {
        attemptHop(input: $input, userInfo: $userInfo) {
          id
          from
          to
          hopKey
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

    const input = {
      from: {
        name: 'alpha',
        links: [{ name: 'alpha-link', associations: [] }],
      },
      to: {
        name: 'beta',
        links: [{ name: 'beta-link', associations: [] }],
      },
      final: {
        name: 'gamma',
        links: [{ name: 'gamma-link', associations: [] }],
      },
    };

    const hopController = {
      attemptHop: jest
        .fn()
        .mockImplementation(
          async (
            args: Record<string, unknown>,
            meta: Record<string, unknown>,
          ) => {
            const hopInput =
              typeof args.input === 'object' && args.input !== null
                ? (args.input as typeof input)
                : (args as unknown as typeof input);
            expect(hopInput).toEqual(input);
            expect(meta).toMatchObject(userInfo);

            return {
              id: nanoid(),
              associations: 'alpha-beta',
              attemptId: userInfo.attemptId,
              ownerId: userInfo.ownerId,
              gameId: userInfo.gameId,
              hopKey: `${input.from.name}::${input.to.name}`,
              from: input.from.name,
              to: input.to.name,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          },
        ),
      getById: jest.fn(),
      getMany: jest.fn(),
      query: jest.fn(),
      removeMany: jest.fn(),
    };

    const { body } = await server.executeOperation(
      {
        query: attemptHopMutation,
        variables: {
          input,
          userInfo,
        },
      },
      {
        contextValue: {
          hopController,
          ...userInfo,
          event: { requestContext: { requestId: 'req-1' } },
        },
      },
    );

    if (body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }

    const { singleResult } = body;

    expect(singleResult.errors).toBeUndefined();
    expect(singleResult.data).toEqual({
      attemptHop: {
        id: expect.any(String),
        from: input.from.name,
        to: input.to.name,
        hopKey: `${input.from.name}::${input.to.name}`,
        ownerId: userInfo.ownerId,
        gameId: userInfo.gameId,
      },
    });
    expect(hopController.attemptHop).toHaveBeenCalledTimes(1);
  });
});
