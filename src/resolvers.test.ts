import { startController } from './itemController';
import resolvers from './resolvers';
import { Item } from './types';

const { Query, Mutation } = resolvers;

const defaultItem: Item = {
  id: 'niner',
  ownerId: 'owner',
  name: 'Niner',
  description: 'My favorite number',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const createItemControllerMock = (
  overrides: Partial<ReturnType<typeof startController>> = {},
): ReturnType<typeof startController> => ({
  getById: jest.fn().mockResolvedValue(undefined),
  listByOwner: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(defaultItem),
  update: jest.fn().mockResolvedValue(defaultItem),
  remove: jest.fn().mockResolvedValue({ ok: true }),
  ...overrides,
});

describe('Resolvers', () => {
  describe('Queries', () => {
    describe('item(id): Item', () => {
      it('fetches an item given an id', async () => {
        const itemController = createItemControllerMock({
          getById: jest.fn().mockResolvedValue({ id: 'niner' }),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { itemController, event: {} },
        );
        expect(item).toEqual({ id: 'niner' });
        expect(itemController.getById).toHaveBeenCalledWith('niner');
      });

      it('returns undefined when fetching something nonexistent', async () => {
        const itemController = createItemControllerMock({
          getById: jest.fn().mockResolvedValue(undefined),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { itemController, event: {} },
        );
        expect(item).toEqual(undefined);
      });

      it("allows you to grab someone else's item", async () => {
        const itemController = createItemControllerMock({
          getById: jest
            .fn()
            .mockResolvedValue({ id: 'niner', owner: 'not-you' }),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { itemController, event: {} },
        );
        expect(item).toEqual({ id: 'niner', owner: 'not-you' });
      });
    });

    describe('items(id): Item[]', () => {
      it('fetches all items of a given ownerId', async () => {
        const results = [
          { id: 'niner', owner: 'you' },
          { id: 'five', owner: 'you' },
        ];
        const itemController = createItemControllerMock({
          listByOwner: jest.fn().mockResolvedValue(results),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'you' } },
          { itemController, event: {} },
        );
        expect(items).toEqual(results);
        expect(itemController.listByOwner).toHaveBeenCalledWith('you');
      });

      it('returns nothing if it is given an unused ownerId', async () => {
        const itemController = createItemControllerMock({
          listByOwner: jest.fn().mockResolvedValue([]),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'nonexistent' } },
          { itemController, event: {} },
        );
        expect(items).toEqual([]);
      });

      it("allows you to grab someone else's items", async () => {
        const results = [
          { id: 'niner', owner: 'not-you' },
          { id: 'five', owner: 'not-you' },
        ];
        const itemController = createItemControllerMock({
          listByOwner: jest.fn().mockResolvedValue(results),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'not-you' } },
          { itemController, event: {} },
        );
        expect(items).toEqual(results);
      });
    });
  });

  describe('Mutations', () => {
    describe('createItem(name, description): Item', () => {
      it('creates an item when given good info', async () => {
        const create = jest.fn().mockResolvedValue(defaultItem);
        const itemController = createItemControllerMock({ create });

        const item = await Mutation.createItem(
          undefined,
          { name: 'Niner', description: 'My favorite number' },
          { itemController, event: {}, ownerId: 'yourself' },
        );
        expect(item).toEqual(defaultItem);
        expect(create).toHaveBeenCalledWith(
          { name: 'Niner', description: 'My favorite number' },
          'yourself',
        );
      });

      it('explodes if not logged in, because orphan items are verboten', async () => {
        const create = jest.fn().mockRejectedValue(new Error('Unauthorized'));
        const itemController = createItemControllerMock({ create });

        await expect(
          Mutation.createItem(
            undefined,
            { name: 'Niner', description: 'My favorite number' },
            { itemController, event: {} },
          ),
        ).rejects.toThrow('Unauthorized');
      });
    });

    describe('updateItem(name, description): Item', () => {
      it('updates an item when given good info', async () => {
        const update = jest.fn().mockResolvedValue(defaultItem);
        const itemController = createItemControllerMock({ update });

        const item = await Mutation.updateItem(
          undefined,
          {
            input: {
              id: 'niner',
              name: 'Niner',
              description: 'My favorite number',
            },
          },
          { itemController, event: {}, ownerId: 'yourself' },
        );
        expect(item).toEqual(defaultItem);
        expect(update).toHaveBeenCalledWith(
          {
            id: 'niner',
            name: 'Niner',
            description: 'My favorite number',
          },
          'yourself',
        );
      });

      it('explodes if no match for id, because its a required property', async () => {
        const update = jest
          .fn()
          .mockRejectedValue(
            new Error('Item deleted or owned by another user'),
          );
        const itemController = createItemControllerMock({ update });

        await expect(
          Mutation.updateItem(
            undefined,
            {
              input: {
                id: 'niner',
                name: 'Niner',
                description: 'My favorite number',
              },
            },
            { itemController, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Item deleted or owned by another user');
      });

      it("never lets you overwrite another user's item because auth sets ownerId", async () => {
        const update = jest
          .fn()
          .mockRejectedValue(
            new Error('Item deleted or owned by another user'),
          );
        const itemController = createItemControllerMock({ update });

        await expect(
          Mutation.updateItem(
            undefined,
            {
              input: {
                id: 'niner',
                name: 'Niner',
                description: 'My favorite number',
              },
            },
            { itemController, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Item deleted or owned by another user');
      });
    });

    describe('deleteItem(name, description): Item', () => {
      it('deletes an item when given good info', async () => {
        const remove = jest.fn().mockResolvedValue({ ok: true });
        const itemController = createItemControllerMock({ remove });

        await expect(
          Mutation.deleteItem(
            undefined,
            { id: 'niner' },
            { itemController, event: {}, ownerId: 'yourself' },
          ),
        ).resolves.toEqual({ ok: true });

        expect(remove).toHaveBeenCalledWith('niner', 'yourself');
      });

      it("explodes if the auth owner id doesn't match the target item", async () => {
        const remove = jest
          .fn()
          .mockRejectedValue(new Error('Conditional check failed'));
        const itemController = createItemControllerMock({ remove });

        await expect(
          Mutation.deleteItem(
            undefined,
            { id: 'niner' },
            { itemController, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Conditional check failed');
      });
    });
  });
});
