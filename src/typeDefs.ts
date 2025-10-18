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

  type Item @key(fields: "id") {
    id: ID!
    name: String
    description: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  input UpdateItemInput {
    id: String!
    name: String
    ownerId: String!
    description: String
  }

  input QueryObject {
    ownerId: String
  }

  type Query {
    item(id: ID!): Item
    items(query: QueryObject!): [Item]
  }

  type Mutation {
    updateItem(input: UpdateItemInput!): Item
    createItem(name: String, description: String): Item
    deleteItem(id: String!): Affirmative
  }
`;
