import { Schema } from 'dynamoose';

export default new Schema(
  {
    id: { type: String, hashKey: true, required: true },
    associations: {
      type: String,
      required: true,
      index: { name: 'associations', type: 'global' },
    },
  },
  { timestamps: true },
);
