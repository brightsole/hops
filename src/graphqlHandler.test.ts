import { gql } from 'graphql-tag';
import { nanoid } from 'nanoid';
import getGraphqlServer from '../test/getGraphqlServer';

// INTEGRATION TEST OF THE FULL PATH
// only test for completion of high level access
// correct low level unit testing should be done on the resolver/util level

describe('Resolver full path', () => {
  it('creates an item without error', async () => {
    const server = getGraphqlServer();

    const createItemMutation = gql`
      mutation CreateItem($name: String, $description: String) {
        createItem(name: $name, description: $description) {
          id
          name
          description
        }
      }
    `;

    const create = jest.fn();
    const itemController = {
      create,
      getById: jest.fn(),
      listByOwner: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const ownerId = 'that guy who makes things';

    const name = 'the diner of despair';
    const description =
      'a horrible place where the clientelle go to get bitten, not a bite';

    create.mockResolvedValueOnce({
      id: nanoid(),
      name,
      description,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { body } = await server.executeOperation(
      {
        query: createItemMutation,
        variables: {
          name,
          description,
        },
      },
      {
        contextValue: {
          ownerId,
          itemController,
        },
      },
    );

    if (body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }

    const { singleResult } = body;

    expect(singleResult.errors).toBeUndefined();
    expect(singleResult.data).toEqual({
      createItem: { id: expect.any(String), name, description },
    });
    expect(create).toHaveBeenCalledWith({ name, description }, ownerId);
  });
});
