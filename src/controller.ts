import { model } from 'dynamoose';
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
import { normalizeWord } from './sanitize';

const hopCache = new LRUCache<string, DBHop>({
  max: 100, // may not be used much, still, may as well cache
});

// cache for frequent queries (built filter objects); keep modest to avoid staleness
const queryCache = new LRUCache<string, DBHop[]>({
  max: 100,
});

const isPresent = <T>(value: T | null | undefined): value is T => value != null;

export const createHopController = (
  HopModel: DBHopModel,
  linkModel: DBLinkModel,
) => ({
  getById: async (id: string) => {
    const cached = hopCache.get(id);
    if (cached) return cached;

    const item = await HopModel.get(id);
    if (item) hopCache.set(id, item);
    return item;
  },

  // uncached for now: evaluate query caching first
  getMany: (ids: string[]) => HopModel.batchGet(ids),

  query: async (queryObject: HopQueryInput) => {
    const builtQuery = Object.entries(queryObject).reduce(
      (acc, [key, value]) => {
        // also, these act as a filter. other properties are ignored
        if (value === undefined) return acc;

        if (['ownerId', 'gameId', 'attemptId'].includes(key))
          return { ...acc, [key]: { eq: value } };

        if (['linkKey', 'associationsKey'].includes(key))
          return { ...acc, [key]: { contains: value } };

        return acc;
      },
      {},
    );

    const key = JSON.stringify(builtQuery);
    const cached = queryCache.get(key);
    if (cached) return Promise.resolve(cached);

    const results = await HopModel.query(builtQuery).exec();

    queryCache.set(key, results);
    return results;
  },

  testLink: (from: string, to: string) => getLink(linkModel, from, to), // exposed for game submission checks

  attemptHop: async (
    { from, to, final }: MutationAttemptHopArgs,
    userInfo: Pick<Context, 'userId' | 'gameId' | 'attemptId'>,
  ): Promise<DBHop[]> => {
    const normalTo = normalizeWord(to);
    const normalFrom = normalizeWord(from);
    const normalFinal = normalizeWord(final);

    if (normalFrom === normalTo || normalTo === normalFinal) {
      throw new Error('Unable to guess the same words');
    }

    const firstLink = await getLink(linkModel, normalFrom, normalTo);

    let finalAssociation = null;
    try {
      finalAssociation = await getLink(linkModel, normalTo, normalFinal);
    } catch {
      /* do nothing, final not guaranteed */
    }

    const hop = await HopModel.create({
      linkKey: firstLink.id,
      associationsKey: firstLink.associationsKey,
      from: normalFrom,
      to: normalTo,
      ownerId: userInfo.userId,
      gameId: userInfo.gameId,
      attemptId: userInfo.attemptId,
      id: nanoid(),
    });
    let finalHop = null;
    if (finalAssociation) {
      finalHop = await HopModel.create({
        id: nanoid(),
        linkKey: finalAssociation.id,
        associationsKey: finalAssociation.associationsKey,
        from: normalTo,
        to: normalFinal,
        isFinal: true,
        ownerId: userInfo.userId,
        gameId: userInfo.gameId,
        attemptId: userInfo.attemptId,
      });
      await fetch(`${env.solvesQueueUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userInfo.attemptId,
          ownerId: userInfo.userId,
          gameId: userInfo.gameId,
          finalHopId: finalHop.id,
        }),
      });
    }

    const results = [hop, finalHop].filter(isPresent);
    results.forEach((item: DBHop) => hopCache.set(item.id, item));
    return results;
  },

  removeMany: async (ids: string[]) => {
    // validation for this must happen in the gateway layer
    await HopModel.batchDelete(ids);
    ids.forEach((id: string) => hopCache.delete(id));

    return { ok: true };
  },
});

export const startController = () => {
  const hopModel = model<DBHop>(env.hopsTableName, HopSchema);
  const linkModel = model<DBLink>(env.linksTableName, LinkSchema);

  return createHopController(hopModel, linkModel);
};
