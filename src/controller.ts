import { model, transaction } from 'dynamoose';
import { nanoid } from 'nanoid';
import type { Word, DBHop, HopQuery, ModelType, HopInput } from './types';
import HopSchema from './Hop.schema';
import env from './env';
import { getAssociations } from './getAssociations';

const isPresent = <T>(value: T | null | undefined): value is T => value != null;

export const createHopController = (HopModel: ModelType) => ({
  getById: (id: string) => HopModel.get(id),

  getMany: (ids: string[]) => HopModel.batchGet(ids),

  query: (queryObject: HopQuery) => {
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
    { from, to, final }: HopInput,
    userInfo: { ownerId: string; gameId: string; attemptId: string },
  ): Promise<DBHop[]> => {
    const hopAssociation = getAssociations(from, to);

    let finalAssociation = null;
    try {
      finalAssociation = getAssociations(to, final);
    } catch (_error) {
      /* do nothing, final not guaranteed */
    }

    const ops = [
      HopModel.transaction.create({
        hopKey: `${from.name}::${to.name}`,
        associations: hopAssociation,
        from: from.name,
        to: to.name,
        ...userInfo,
      }),
      finalAssociation
        ? HopModel.transaction.create({
            id: nanoid(),
            hopKey: `${to.name}::${final.name}`,
            associations: finalAssociation,
            from: to.name,
            to: final.name,
            ...userInfo,
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
  const hopModel = model<DBHop>(env.tableName, HopSchema);

  return createHopController(hopModel);
};
