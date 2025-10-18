import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
  TABLE_NAME: str({
    desc: 'DynamoDB table name for items',
    default: 'ABJECT_FAILURE', // keep it from hard erroring if you screw up env vars
  }),
  AWS_REGION: str({ default: 'ap-southeast-2' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),
});

export default {
  region: env.AWS_REGION,
  tableName: env.TABLE_NAME,
  isProduction: env.NODE_ENV === 'production',
};
