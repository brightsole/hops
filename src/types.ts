import type { Model } from 'dynamoose/dist/Model';
import type { Item as DynamooseItem } from 'dynamoose/dist/Item';
import type {
  Context as LambdaContext,
  APIGatewayProxyEventV2,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { createHopController } from './controller';

export type GatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
export interface LambdaContextFunctionArgument {
  event: GatewayEvent;
  context: LambdaContext;
}

type Association = {
  type: string;
  score?: number;
};

type Link = {
  name: string;
  associations: Association[];
};

export type Word = {
  cacheExpiryDate: number;
  updatedAt: number;
  version: number;
  links: Link[];
  name: string;
};

export type Hop = {
  associations: string;
  createdAt: number;
  updatedAt: number;
  attemptId: string;
  ownerId: string;
  gameId: string;
  hopKey: string;
  from: string;
  to: string;
  id: string;
};
export type DBHop = DynamooseItem & Hop;
export type ModelType = Model<DBHop>;

export type IdObject = {
  id: string;
};

export type HopInput = { from: Word; to: Word; final: Word };

export type HopQuery = {
  associations?: string;
  attemptId?: string;
  ownerId?: string;
  gameId?: string;
  hopKey?: string;
};

export type Context = {
  hopController: ReturnType<typeof createHopController>;
  attemptId: string;
  ownerId: string;
  gameId: string;
  event: unknown;
};

export type Affirmative = {
  ok: boolean;
};

export enum ASSOCIATION_TYPES {
  // Algorithmic
  anagram = 'agram',

  // RiTa
  rhymes = 'rhyme',
  spelledLike = 'spelledLike',

  // overlap
  // hopefully we'll swap to RiTa
  soundsLike = 'soundsLike',

  // Datamuse
  meansLike = 'means',
  associatedWith = 'associated',
  comprisedWith = 'comprised',
  oppositeOf = 'opposite',
  isMoreSpecificTerm = 'moreSpecific',
  isMoreGeneralTerm = 'moreGeneral',
  popularNounPairings = 'popNounPair',
  popularAdjectivePairings = 'popAdjPair',
  aPartOf = 'aPart',
  commonlyFollowedBy = 'followedBy',
  commonlyPrecededBy = 'precededBy',
  homophoneOf = 'homophone', // might overlap soundsLike?
}
