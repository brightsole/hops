import { Condition, model } from 'dynamoose';
import { nanoid } from 'nanoid';
import type { Item, DBItem, ModelType } from './types';
import ItemSchema from './Item.schema';
import env from './env';

export const createItemController = (ItemModel: ModelType) => ({
  getById: (id: string) => ItemModel.get(id),

  listByOwner: (ownerId?: string) =>
    ItemModel.query('ownerId').eq(ownerId).using('ownerId').exec(),

  create: (input: Partial<Item>, ownerId?: string) => {
    if (!ownerId) throw new Error('Unauthorized');
    return ItemModel.create(
      {
        id: nanoid(),
        ownerId,
        ...input,
      },
      {
        overwrite: false,
      },
    );
  },

  update: async (input: Partial<Item>, ownerId?: string) => {
    const { id, ...rest } = input;

    return ItemModel.update(
      { id },
      { ...rest, ownerId },
      {
        condition: new Condition()
          .where('ownerId')
          .eq(ownerId)
          .and()
          .attribute('id')
          .exists(),
        returnValues: 'ALL_NEW',
      },
    );
  },

  remove: async (id: string, ownerId?: string) => {
    await ItemModel.delete(id, {
      condition: new Condition().where('ownerId').eq(ownerId),
    });

    return { ok: true };
  },
});

export const startController = () => {
  const itemModel = model<DBItem>(env.tableName, ItemSchema);

  return createItemController(itemModel);
};
