import { Schema } from 'dynamoose';

export default new Schema(
  {
    id: { type: String, hashKey: true, required: true },
    attemptId: {
      type: String,
      required: true,
      index: { name: 'attemptId', type: 'global' },
    },
    first: {
      type: Boolean,
      index: { name: 'first', type: 'global' },
    },
    ownerId: {
      type: String,
      required: true,
      index: { name: 'ownerId', type: 'global' },
    },
    gameId: {
      type: String,
      required: true,
      index: { name: 'gameId', type: 'global' },
    },
    from: { type: String },
    to: { type: String },
    hopKey: {
      type: String,
      required: true,
      index: { name: 'hopKey', type: 'global' },
    },
    associations: {
      type: String,
      required: true,
      index: { name: 'associations', type: 'global' },
    },
  },
  { timestamps: true },
);
