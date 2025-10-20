import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import type { Context, IdObject, HopQuery, HopInput } from './types';

export default {
  Query: {
    hop: async (
      _: undefined,
      { id }: { id: string },
      { hopController }: Context,
    ) => hopController.getById(id),
    // for extra security, we could ignore the props passed in, and instead only grab items that belong to
    // the ownerId passed in the headers. This could also be overly limiting if items aren't private
    hops: async (
      _: undefined,
      { query }: { query: HopQuery },
      { hopController }: Context,
    ) => hopController.query(query),
  },

  Mutation: {
    attemptHop: async (
      _: undefined,
      input: HopInput,
      { hopController, ...rest }: Context,
    ) => hopController.attemptHop(input, rest),

    deleteHops: async (
      _: undefined,
      { ids }: { ids: string[] },
      { hopController }: Context,
    ) => hopController.removeMany(ids),
  },

  Hop: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ id }: IdObject, { hopController }: Context) =>
      hopController.getById(id),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};
