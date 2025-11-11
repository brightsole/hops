/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'hops-service',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
    };
  },
  async run() {
    const linksTable = new sst.aws.Dynamo('Links', {
      fields: {
        id: 'string',
        associationsKey: 'string',
      },
      globalIndexes: {
        associationsKey: { hashKey: 'associationsKey' },
      },
      primaryIndex: { hashKey: 'id' },
      deletionProtection: $app.stage === 'production',
    });
    const hopsTable = new sst.aws.Dynamo('Hops', {
      fields: {
        id: 'string',
        gameId: 'string',
        linkKey: 'string',
        ownerId: 'string',
        attemptId: 'string',
        associationsKey: 'string',
      },
      globalIndexes: {
        gameId: { hashKey: 'gameId' },
        linkKey: { hashKey: 'linkKey' },
        ownerId: { hashKey: 'ownerId' },
        attemptId: { hashKey: 'attemptId' },
        associationsKey: { hashKey: 'associationsKey' },
      },
      primaryIndex: { hashKey: 'id' },
      deletionProtection: $app.stage === 'production',
    });

    const internalAuth = await aws.secretsmanager.getSecretVersionOutput({
      secretId: `jumpingbeen/${$app.stage}/internal-lockdown`,
    });

    const api = new sst.aws.ApiGatewayV2('Api', {
      link: [hopsTable, linksTable],
    });

    // new sst.aws.Cron('KeepWarmCron', {
    //   // every 5 minutes, roughly 8am to 6pm, Mon-Fri, Australia/Sydney time
    //   // keeps it warm at all times during business hours
    //   schedule: 'cron(*/5 21-23,0-8 ? * SUN-FRI *)',
    //   job: {
    //     handler: 'src/keepWarm.handler',
    //     environment: {
    //       PING_URL: api.url,
    //     },
    //   },
    // });

    // Store the API URL as a CloudFormation output for federation lookup
    new aws.ssm.Parameter('HopsApiUrl', {
      name: `/sst/${$app.name}/${$app.stage}/api-url`,
      type: 'String',
      value: api.url,
      description: `API Gateway URL for ${$app.name} ${$app.stage}`,
    });
    // only get the url of services "below" this one
    const wordsApiUrl = await aws.ssm.getParameter({
      name: `/sst/words-service/${$app.stage}/api-url`,
    });
    // the url of the queue exists for going "up" the chain
    // without causing a caustic mess of circular deps/calls
    //
    // We've decided to simplify hops and no longer call "up"
    // attempts already needs to call hops and games, no reason
    // to complicate the flow with event emission
    // const solvesQueueUrl = await aws.ssm.getParameter({
    //   name: `/sst/solves-service/${$app.stage}/queue-url`,
    // });

    const authSecrets = internalAuth.secretString.apply((s) => JSON.parse(s!));

    const functionConfig = {
      runtime: 'nodejs22.x' as const,
      timeout: '20 seconds' as const,
      memory: '1024 MB' as const,
      nodejs: {
        format: 'esm' as const,
      },
      environment: {
        HOPS_TABLE_NAME: hopsTable.name,
        LINKS_TABLE_NAME: linksTable.name,
        WORDS_API_URL: wordsApiUrl.value,
        INTERNAL_SECRET_HEADER_NAME: authSecrets.apply(
          (v) => v.INTERNAL_SECRET_HEADER_NAME,
        ),
        INTERNAL_SECRET_HEADER_VALUE: authSecrets.apply(
          (v) => v.INTERNAL_SECRET_HEADER_VALUE,
        ),
      },
    };

    api.route('ANY /graphql', {
      ...functionConfig,
      handler: 'src/graphqlHandler.handler',
    });

    api.route('ANY /hops', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    api.route('ANY /hops/{proxy+}', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    // in the future we may expose links via REST too
    // minimal non-user records can make for fun charts

    return {
      graphUrl: api.url.apply((o) => `${o}/graphql`),
      restApiUrl: api.url.apply((o) => `${o}/hops`),
      hopsTableName: hopsTable.name,
      linksTableName: linksTable.name,
    };
  },
});
