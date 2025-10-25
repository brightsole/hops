import { model, transaction } from 'dynamoose';
import { LRUCache } from 'lru-cache';
import { nanoid } from 'nanoid';
import type { Context, DBHop, DBLink, DBHopModel, DBLinkModel } from './types';
import type {
  HopQueryInput,
  MutationAttemptHopArgs,
} from './generated/graphql';
import { getLink } from './getLink';
import HopSchema from './Hop.schema';
import LinkSchema from './Link.schema';
import env from './env';

const hopCache = new LRUCache<string, DBHop>({
  max: 100, // may not be used much, still may as well cache
});

const isPresent = <T>(value: T | null | undefined): value is T => value != null;

export const createHopController = (
  HopModel: DBHopModel,
  linkModel: DBLinkModel,
) => ({
  getById: (id: string) => HopModel.get(id),

  getMany: (ids: string[]) => HopModel.batchGet(ids),

  query: (queryObject: HopQueryInput) => {
    const builtQuery = Object.entries(queryObject).reduce(
      (acc, [key, value]) => {
        // also, these act as a filter. other properties are ignored
        if (value === undefined) return acc;

        if (['ownerId', 'gameId', 'attemptId', 'hopKey'].includes(key))
          return { ...acc, [key]: { eq: value } };

        if (['hopKey', 'associations'].includes(key))
          return { ...acc, [key]: { contains: value } };

        return acc;
      },
      {},
    );

    return HopModel.query(builtQuery).exec();
  },

  attemptHop: async (
    { from, to, final }: MutationAttemptHopArgs,
    userInfo: Pick<Context, 'userId' | 'gameId' | 'attemptId'>,
  ): Promise<DBHop[]> => {
    const firstLink = await getLink(linkModel, from, to);

    let finalAssociation = null;
    try {
      finalAssociation = await getLink(linkModel, to, final);
    } catch (_error) {
      /* do nothing, final not guaranteed */
    }

    const ops = [
      HopModel.transaction.create({
        linkKey: firstLink.id,
        associations: firstLink.associations,
        from: from,
        to: to,
        ownerId: userInfo.userId,
        gameId: userInfo.gameId,
        attemptId: userInfo.attemptId,
        id: nanoid(),
      }),
      finalAssociation
        ? HopModel.transaction.create({
            id: nanoid(),
            linkKey: finalAssociation.id,
            associations: finalAssociation.associations,
            from: to,
            to: final,
            ownerId: userInfo.userId,
            gameId: userInfo.gameId,
            attemptId: userInfo.attemptId,
          })
        : null,
    ].filter(isPresent);

    return transaction(ops).exec();
  },

  removeMany: async (ids: string[]) => {
    // validation for this must happen in the gateway layer
    await HopModel.batchDelete(ids);

    return { ok: true };
  },
});

export const startController = () => {
  const hopModel = model<DBHop>(env.hopsTableName, HopSchema);
  const linkModel = model<DBLink>(env.linksTableName, LinkSchema);

  return createHopController(hopModel, linkModel);
};
