import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
  HOPS_TABLE_NAME: str({
    desc: 'DynamoDB table name for items',
    default: 'ABJECT_FAILURE', // keep it from hard erroring if you screw up env vars
  }),
  LINKS_TABLE_NAME: str({
    desc: 'DynamoDB table name for items',
    default: 'ABJECT_FAILURE', // keep it from hard erroring if you screw up env vars
  }),
  AWS_REGION: str({ default: 'ap-southeast-2' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),
  WORDS_API_URL: str({
    desc: 'URL for Words Service API Gateway',
    default: '',
  }),
});

export default {
  region: env.AWS_REGION,
  wordsApiUrl: env.WORDS_API_URL,
  hopsTableName: env.HOPS_TABLE_NAME,
  linksTableName: env.LINKS_TABLE_NAME,
  isProduction: env.NODE_ENV === 'production',
};
