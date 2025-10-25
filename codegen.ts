import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/typeDefs.ts',
  documents: ['src/**/*.ts', '!src/generated/**/*'],
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../types#Context',
        useTypeImports: true,
        scalars: {
          // Our DB stores timestamps as numbers; map DateTime output accordingly
          DateTime: { input: 'Date', output: 'number' },
          JSONObject: 'Record<string, unknown>',
        },
        federation: true,
      },
    },
  },
  hooks: {},
};

export default config;
