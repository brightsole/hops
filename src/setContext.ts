import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './itemController';

export const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const { id } = event.headers;
  const itemController = startController();

  return {
    ...context,
    ownerId: id,
    event,
    itemController,
  };
};

export default setContext;
