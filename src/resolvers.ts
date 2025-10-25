import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import type { Resolvers } from './generated/graphql';
import type { Context } from './types';

const resolvers: Resolvers = {
  Query: {
    hop: async (_parent, { id }, { hopController }) =>
      hopController.getById(id),
    // for extra security, we could ignore the props passed in, and instead only grab items that belong to
    // the ownerId passed in the headers. This could also be overly limiting if items aren't private
    hops: async (_parent, { query }, { hopController }) =>
      hopController.query(query),
  },

  Mutation: {
    attemptHop: async (
      _parent,
      input,
      { hopController, userId, attemptId, gameId }: Context,
    ) => hopController.attemptHop(input, { userId, attemptId, gameId }),

    deleteHops: async (_parent, { ids }, { hopController }) =>
      hopController.removeMany(ids),
  },

  Hop: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ id }, { hopController }) =>
      hopController.getById(id),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};

export default resolvers;
