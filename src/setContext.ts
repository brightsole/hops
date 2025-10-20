import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';

export const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const { id, gameId, attemptId } = event.headers;
  const hopController = startController();

  if (!id || !gameId || !attemptId) {
    throw new Error('Missing required headers');
  }

  return {
    ...context,
    ownerId: id,
    gameId,
    attemptId,
    event,
    hopController,
  };
};

export default setContext;
