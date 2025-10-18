import { Schema } from 'dynamoose';

export default new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: { name: 'ownerId', type: 'global' },
    },
    id: { type: String, hashKey: true, required: true },
    description: { type: String },
    name: { type: String },
  },
  { timestamps: true },
);
