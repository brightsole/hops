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
    const hopsTable = new sst.aws.Dynamo('Hops', {
      fields: {
        id: 'string',
        gameId: 'string',
        hopKey: 'string',
        ownerId: 'string',
        attemptId: 'string',
        associations: 'string',
      },
      globalIndexes: {
        hopKey: { hashKey: 'hopKey' },
        gameId: { hashKey: 'gameId' },
        ownerId: { hashKey: 'ownerId' },
        attemptId: { hashKey: 'attemptId' },
        associations: { hashKey: 'associations' },
      },
      primaryIndex: { hashKey: 'id' },
      deletionProtection: $app.stage === 'production',
    });

    const api = new sst.aws.ApiGatewayV2('Api', {
      link: [hopsTable],
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
    // const hopsApiUrl = await aws.ssm.getParameter({
    //   name: `/sst/hops-service/${$app.stage}/api-url`,
    // });
    // then you put it into the environment below

    const functionConfig = {
      runtime: 'nodejs22.x',
      timeout: '20 seconds',
      memory: '1024 MB',
      nodejs: {
        format: 'esm',
      },
      environment: {
        TABLE_NAME: hopsTable.name,
      },
    } as const;

    api.route('ANY /graphql', {
      ...functionConfig,
      handler: 'src/graphqlHandler.handler',
    });

    api.route('ANY /items', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    api.route('ANY /items/{proxy+}', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    return {
      apiUrl: api.url,
      hopsTableName: hopsTable.name,
    };
  },
});
