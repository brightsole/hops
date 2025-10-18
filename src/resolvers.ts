import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import type { Context, IdObject, Item } from './types';

export default {
  Query: {
    item: async (
      _: undefined,
      { id }: { id: string },
      { itemController }: Context,
    ) => itemController.getById(id),
    // for extra security, we could ignore the props passed in, and instead only grab items that belong to
    // the ownerId passed in the headers. This could also be overly limiting if items aren't private
    items: async (
      _: undefined,
      { query: { ownerId } }: { query: { ownerId: string } },
      { itemController }: Context,
    ) => itemController.listByOwner(ownerId),
  },

  Mutation: {
    createItem: async (
      _: undefined,
      { name, description }: { name?: string; description?: string },
      { ownerId, itemController }: Context,
    ): Promise<Item> => itemController.create({ name, description }, ownerId),

    updateItem: async (
      _: undefined,
      { input: partialItem }: { input: Partial<Item> },
      { ownerId, itemController }: Context,
    ): Promise<Item> => itemController.update(partialItem, ownerId),

    deleteItem: async (
      _: undefined,
      { id }: IdObject,
      { ownerId, itemController }: Context,
    ) => itemController.remove(id, ownerId),
  },

  Item: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ id }: IdObject, { itemController }: Context) =>
      itemController.getById(id),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};
