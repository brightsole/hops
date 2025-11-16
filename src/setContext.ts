import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';
import { GraphQLError } from 'graphql';
import env from './env';

export const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  // todo fix this better with x-blahs and getters
  const ownerId = event.headers['x-owner-id'];
  const gameId = event.headers['x-game-id'];
  const attemptId = event.headers['x-attempt-id'];
  const hopController = startController();

  const body = JSON.parse(event.body ?? '{}');
  const isIntrospectionQuery =
    body?.operationName === 'IntrospectionQuery' &&
    body?.query?.includes('__schema');

  if (
    !isIntrospectionQuery &&
    event.headers[env.authHeaderName] !== env.authHeaderValue
  ) {
    throw new GraphQLError('Unauthorized', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }

  return {
    ...context,
    ownerId,
    gameId,
    attemptId,
    event,
    hopController,
  };
};

export default setContext;
