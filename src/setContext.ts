import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';

export const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  // todo fix this better with x-blahs and getters
  const userId = event.headers['x-user-id'];
  const gameId = event.headers['x-game-id'];
  const attemptId = event.headers['x-attempt-id'];
  const hopController = startController();

  if (!userId || !gameId || !attemptId) {
    throw new Error('Missing required headers');
  }

  return {
    ...context,
    userId,
    gameId,
    attemptId,
    event,
    hopController,
  };
};

export default setContext;
