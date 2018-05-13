/**
 * This file should be removed once we support
 * the user passing in their schema.
 */

import { buildSchema, GraphQLSchema } from 'graphql';

const rawSchema: string = `
type User {
	name: String!
	lastPost: Post
	posts: [Post]
}

type Post {
	title: String!
	author: User!
}

type Query {
	user(id: ID!): User
}

schema {
	query: Query
}
`;

const schema: GraphQLSchema = buildSchema(rawSchema);

export default schema;
