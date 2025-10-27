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
    ok: Boolean! @shareable
  }

  type Hop @key(fields: "id") {
    id: ID!
    name: String
    from: String
    to: String
    isFinal: Boolean
    associationsKey: String
    attemptId: String
    ownerId: String
    gameId: String
    linkKey: ID!
    createdAt: DateTime
    updatedAt: DateTime
  }

  input HopQueryInput {
    ownerId: String
    gameId: String
    attemptId: String
    linkKey: ID
    associationsKey: String
  }

  type Query {
    hop(id: ID!): Hop
    hops(query: HopQueryInput!): [Hop]
  }

  type Mutation {
    attemptHop(from: ID!, to: ID!, final: ID!): [Hop]
    deleteHops(ids: [String!]!): Affirmative
  }
`;
