import { Schema } from 'dynamoose';

export default new Schema(
  {
    id: { type: String, hashKey: true, required: true },
    associationsKey: {
      type: String,
      required: true,
      index: { name: 'associationsKey', type: 'global' },
    },
    version: { type: Number, required: true },
  },
  { timestamps: true },
);
