import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
  HOPS_TABLE_NAME: str({
    desc: 'DynamoDB table name for user hops',
    default: 'ABJECT_FAILURE',
  }),
  LINKS_TABLE_NAME: str({
    desc: 'DynamoDB table name for work linkages',
    default: 'ABJECT_FAILURE',
  }),
  AWS_REGION: str({ default: 'ap-southeast-2' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),
  WORDS_API_URL: str({
    desc: 'URL for Words Service API Gateway',
  }),
});

export default {
  region: env.AWS_REGION,
  wordsApiUrl: env.WORDS_API_URL,
  hopsTableName: env.HOPS_TABLE_NAME,
  linksTableName: env.LINKS_TABLE_NAME,
  isProduction: env.NODE_ENV === 'production',
};
