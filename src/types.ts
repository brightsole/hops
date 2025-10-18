import type { Model } from 'dynamoose/dist/Model';
import type { Item as DynamooseItem } from 'dynamoose/dist/Item';
import type {
  Context as LambdaContext,
  APIGatewayProxyEventV2,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { createItemController } from './itemController';

export type GatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
export interface LambdaContextFunctionArgument {
  event: GatewayEvent;
  context: LambdaContext;
}

export type Item = {
  description?: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  name?: string;
  id: string;
};
export type DBItem = DynamooseItem & Item;
export type ModelType = Model<DBItem>;

export type IdObject = {
  id: string;
};

export type Context = {
  itemController: ReturnType<typeof createItemController>;
  ownerId?: string;
  event: unknown;
};

export type Affirmative = {
  ok: boolean;
};
