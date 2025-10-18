import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';
import { buildSubgraphSchema } from '@apollo/subgraph';
import resolvers from '../src/resolvers';
import typeDefs from '../src/typeDefs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (_context: any = {}) =>
  new ApolloServer<typeof _context>({
    schema: buildSubgraphSchema([
      {
        typeDefs,
        resolvers,
      },
    ]),
    maxRecursiveSelections: 7,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  });
