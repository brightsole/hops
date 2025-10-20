import { gql } from 'graphql-tag';

export default gql`
  scalar DateTime
  scalar JSONObject

  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Affirmative {
    ok: Boolean!
  }

  type Hop @key(fields: "id") {
    id: ID!
    name: String
    from: String
    to: String
    associations: String
    attemptId: String
    ownerId: String
    gameId: String
    hopKey: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  input UserInfo {
    attemptId: String!
    ownerId: String!
    gameId: String!
  }

  input Association {
    type: String!
    score: Float
  }

  input Link {
    name: ID!
    associations: [Association!]!
  }

  input Word {
    name: ID!
    links: [Link!]!
  }

  input AttemptHopInput {
    from: Word!
    to: Word!
    final: Word!
  }

  input HopQueryInput {
    ownerId: String
    gameId: String
    attemptId: String
    hopKey: String
    associations: String
  }

  type Query {
    hop(id: ID!): Hop
    hops(query: HopQueryInput!): [Hop]
  }

  type Mutation {
    attemptHop(input: AttemptHopInput!, userInfo: UserInfo!): Hop
    deleteHops(ids: [String!]!): Affirmative
  }
`;
