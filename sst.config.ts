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
        associations: 'string',
      },
      globalIndexes: {
        gameId: { hashKey: 'gameId' },
        linkKey: { hashKey: 'linkKey' },
        ownerId: { hashKey: 'ownerId' },
        attemptId: { hashKey: 'attemptId' },
        associations: { hashKey: 'associations' },
      },
      primaryIndex: { hashKey: 'id' },
      deletionProtection: $app.stage === 'production',
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
    // roughly how to get the api url in fed gateway:
    const wordsApiUrl = await aws.ssm.getParameter({
      name: `/sst/words-service/${$app.stage}/api-url`,
    });
    // then you put it into the environment below

    const functionConfig = {
      runtime: 'nodejs22.x',
      timeout: '20 seconds',
      memory: '1024 MB',
      nodejs: {
        format: 'esm',
      },
      environment: {
        HOPS_TABLE_NAME: hopsTable.name,
        LINKS_TABLE_NAME: linksTable.name,
        WORDS_API_URL: wordsApiUrl.value,
      },
    } as const;

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

    return {
      apiUrl: api.url,
      hopsTableName: hopsTable.name,
      linksTableName: linksTable.name,
    };
  },
});
