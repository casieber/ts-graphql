import { buildSchema, parse } from 'graphql';

import { documentToType, buildTypeBuilder, logNode } from './query';

const schemaStr = `
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

const schema = buildSchema(schemaStr);

const queryStr = `{
	user(id: "abc") {
		name
		lastPost {
			title
		}
	}
}`;

const root = {
	user: ({ id }) => (id === 'abc' ? { name: 'Colby' } : null),
};

// graphql(schema, queryStr, root).then(result => {
// 	if (result.errors) {
// 		console.log(result.errors);
// 	} else {
// 		console.log(result.data);
// 	}
// });

const query = parse(queryStr);

// Pick out the selected things
const selections = documentToType(query);

// Transform into actual type
const pickToType = buildTypeBuilder(schema);

const typeNode = pickToType(selections);

logNode(typeNode);
