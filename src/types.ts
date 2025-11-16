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

/* External data types */
type Association = {
  type: string;
  score?: number;
};

type WordLink = {
  name: string;
  associations: Association[];
};

export type Word = {
  cacheExpiryDate: number;
  updatedAt: number;
  links: WordLink[];
  version: number;
  name: string;
};

/* internal database/dynamoose types */
export type DBHop = DynamooseItem & {
  id: string;
  linkKey: string;
  associationsKey: string;
  from: string;
  to: string;
  isFinal?: boolean;
  attemptId: string;
  ownerId: string;
  gameId: string;
  createdAt: number;
  updatedAt: number;
};
export type DBHopModel = Model<DBHop>;

export type Link = {
  id: string;
  associationsKey: string;
  version: number;
  createdAt: number;
  updatedAt: number;
};
export type DBLink = DynamooseItem & Link;
export type DBLinkModel = Model<DBLink>;

/* other useful types not generated */
export type Context = {
  hopController: ReturnType<typeof createHopController>;
  attemptId?: string;
  ownerId?: string;
  gameId?: string;
  event: unknown;
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
