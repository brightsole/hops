import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';
import { buildSubgraphSchema } from '@apollo/subgraph';
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from '@as-integrations/aws-lambda';
import resolvers from './resolvers';
import setContext from './setContext';
import typeDefs from './typeDefs';

export const createGraphqlServer = () =>
  new ApolloServer({
    schema: buildSubgraphSchema([
      {
        typeDefs,
        resolvers,
      },
    ]),
    introspection: true,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });

export const handler = startServerAndCreateLambdaHandler(
  createGraphqlServer(),
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: setContext,
  },
);
