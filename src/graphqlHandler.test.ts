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

    const input = {
      from: 'alpha',
      to: 'beta',
      final: 'gamma',
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
              linkKey: `${input.from}::${input.to}`,
              from: input.from,
              to: input.to,
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
        variables: input,
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
        from: input.from,
        to: input.to,
        linkKey: `${input.from}::${input.to}`,
        ownerId: userInfo.ownerId,
        gameId: userInfo.gameId,
      },
    });
    expect(hopController.attemptHop).toHaveBeenCalledTimes(1);
  });
});
