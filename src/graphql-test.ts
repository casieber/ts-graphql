import {
	buildSchema,
	validateSchema,
	validate,
	execute,
	graphql,
	parse,
	DocumentNode,
	OperationDefinitionNode,
	FieldNode,
	FragmentSpreadNode,
	InlineFragmentNode,
	SelectionSetNode,
	GraphQLSchema,
	GraphQLField,
	GraphQLFieldMap,
	GraphQLType,
	GraphQLScalarType,
	GraphQLObjectType,
	GraphQLNonNull,
	GraphQLList,
	GraphQLUnionType,
	GraphQLEnumType,
	GraphQLInputObjectType,
	GraphQLInterfaceType,
} from 'graphql';

import * as ts from 'typescript';

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
`

const schema = buildSchema(schemaStr);

const queryStr = `{
	user(id: "abc") {
		name
		lastPost {
			title
		}
	}
}`

const root = {
	user: ({ id }) => id === 'abc' ? ({ name: 'Colby' }) : null
}

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

// Attempt to build type based on queryStr

type DeepPick = { [key: string]: true | DeepPick };


/**
 * Helpers for converting a DocumentNode into a deep pick of results
 */

function documentToType(doc: DocumentNode): DeepPick {
	if (doc.definitions.length > 1) {
		throw 'Can only handle documents with one definition currently';
	}

	if (doc.definitions.length === 0) {
		throw 'Document has no definitions';
	}

	const definition = doc.definitions[0];

	if (definition.kind !== 'OperationDefinition') {
		throw 'Can only handle OperationDefinition kinds';
	}

	switch(definition.operation) {
		case 'query':
			return queryToResultType(definition);
		case 'mutation':
		case 'subscription':
		default:
			throw `Operation type ${definition.operation} not supported`;
	}
}

function queryToResultType(query: OperationDefinitionNode) {
	return selectionSetOwnerToResultType(query.selectionSet);
}

function selectionSetOwnerToResultType(selectionSet: SelectionSetNode): DeepPick {
	return selectionSet.selections.reduce((obj, node) => {
		const [name, value] = selectionToResultType(node);
		obj[name] = value;
		return obj;
	}, {} as any);
}

function selectionToResultType(selection: FieldNode | FragmentSpreadNode | InlineFragmentNode): [string, true | DeepPick] {
	switch (selection.kind) {
		case 'Field':
			return [selection.name.value, fieldToResultType(selection)];
		case 'FragmentSpread':
			throw `Cannot yet parse FragmentSpreads`;
		case 'InlineFragment':
			throw `Cannot yet parse InlineFragments`;
		default:
			throw `Unknown selection kind: ${selection!.kind}`;
	}
}

function fieldToResultType(selection: FieldNode) {
	// If there is no selection set, this should be a scalar value
	if (!selection.selectionSet) {
		return true;
	}

	// Otherwise we need to parse the selection set
	return selectionSetOwnerToResultType(selection.selectionSet);
}

/**
 * Helpers for transforming a deep pick into an actual type
 */

function buildTypeBuilder(schema: GraphQLSchema) {
	return function (pick: DeepPick) {
		return ts.createTypeReferenceNode(
			'GraphQLQueryString',
			[entriesToTypeLiteral(pick, schema.getQueryType().getFields())]
		);
	}
}

function propertySignature(name: string, type: ts.TypeNode) {
	return ts.createPropertySignature(
		undefined,
		name,
		undefined,
		type,
		undefined,
	);
}

function basicGraphQlTypeToTypeNode(type: GraphQLType): ts.TypeNode {
	if (type instanceof GraphQLScalarType) {
		return tsTypeFromGraphQLScalarType(type);
	} else if (type instanceof GraphQLEnumType) {
		return ts.createUnionTypeNode(
			type.getValues().map(
				({ name }) => ts.createLiteralTypeNode(ts.createLiteral(name))
			)
		);
	} else if (type instanceof GraphQLList) {
		return ts.createArrayTypeNode(
			basicGraphQlTypeToTypeNode(type.ofType)
		);
	} else if (type instanceof GraphQLNonNull) {
		// TODO - add support in output TS type for optional fields
		return basicGraphQlTypeToTypeNode(type.ofType);
	} else {
		throw `type is not a basic type`;
	}
}

function advancedGraphQLTypeToTypeNode(type: GraphQLType, pick: DeepPick): ts.TypeNode {
	if (type instanceof GraphQLObjectType) {
		return tsTypeFromGraphQLObjectType(type, pick);
	} else if (type instanceof GraphQLUnionType) {
		throw 'Cannot yet parse union types';
	} else if (type instanceof GraphQLList) {
		return ts.createArrayTypeNode(
			advancedGraphQLTypeToTypeNode(type.ofType, pick)
		);
	} else if (type instanceof GraphQLNonNull) {
		// TODO - add support in output TS type for optional fields
		return advancedGraphQLTypeToTypeNode(type.ofType, pick);
	}
}

function tsTypeFromGraphQLScalarType(type: GraphQLScalarType): ts.TypeNode {
	switch (type.name) {
		case 'String':
			return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
		case 'Int':
		case 'Float':
			return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
		case 'Boolean':
			return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
		default:
			throw `Unknown GraphQLScalarType Name: ${type.name}`;
	}
}

function tsTypeFromGraphQLObjectType(type: GraphQLObjectType, pick: DeepPick): ts.TypeNode {
	return entriesToTypeLiteral(pick, type.getFields());
}

function entriesToTypeLiteral(pick: DeepPick, fields: GraphQLFieldMap<any, any>): ts.TypeLiteralNode {
	return ts.createTypeLiteralNode(
		Object.keys(pick).map(key =>
			propertySignature(key, entryToType(pick[key], fields[key]))
		)
	)
}

function entryToType(value: boolean | DeepPick, field: GraphQLField<any, any, any>) {
	if (typeof value === 'boolean') {
		// Get the schema type
		return basicGraphQlTypeToTypeNode(field.type);
	}

	// Otherwise it's a more advanced type that we need to find and recurse
	return advancedGraphQLTypeToTypeNode(field.type, value);
}