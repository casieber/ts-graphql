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

// Attempt to build type based on queryStr

export type DeepPick = { [key: string]: true | DeepPick };

/**
 * Helpers for converting a DocumentNode into a deep pick of results
 */

/**
 * Converts a GraphQL DocumentNode into a DeepPick of the fields selected
 *
 * @param doc The DocumentNode to convert
 * @returns A DeepPick representing the selected fields
 */
export function documentToType(doc: DocumentNode): DeepPick {
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

	switch (definition.operation) {
		case 'query':
			return queryToResultType(definition);
		case 'mutation':
		case 'subscription':
		default:
			throw `Operation type ${definition.operation} not supported`;
	}
}

/**
 * Converts a GraphQL query into a DeepPick of the fields selected
 *
 * @param query The GraphQL query to convert
 * @returns A DeepPick representing the selected fields
 */
export function queryToResultType(query: OperationDefinitionNode): DeepPick {
	return selectionSetOwnerToResultType(query.selectionSet);
}

/**
 * Converts a GraphQL selection set into a DeepPick of the fields selected
 * @param selectionSet The selection set to convert
 * @returns A DeepPick representing the selected fields
 */
export function selectionSetOwnerToResultType(
	selectionSet: SelectionSetNode,
): DeepPick {
	return selectionSet.selections.reduce(
		(obj, node) => {
			const [name, value] = selectionToResultType(node);
			obj[name] = value;
			return obj;
		},
		{} as any,
	);
}

/**
 * Converts a GraphQL selection set item into a key-value tuple for the fields selected.
 * The value will be 'true' if this is a scalar field, otherwise the value will be a
 * DeepPick representing the deeper selected fields.
 *
 * @param selection The selection to convert
 * @returns A key-value tuple
 */
export function selectionToResultType(
	selection: FieldNode | FragmentSpreadNode | InlineFragmentNode,
): [string, true | DeepPick] {
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

/**
 * Converts a GraphQL FieldNode into the appropriate DeepPick value, which
 * is either the value 'true' or a further DeepPick.
 *
 * @param field The FieldNode to convert
 * @returns 'true' if this field is a scalar field, otherwise a DeepPick
 */
export function fieldToResultType(field: FieldNode): true | DeepPick {
	// If there is no selection set, this should be a scalar value
	if (!field.selectionSet) {
		return true;
	}

	// Otherwise we need to parse the selection set
	return selectionSetOwnerToResultType(field.selectionSet);
}

/**
 * Helpers for transforming a deep pick into an actual type
 */

/**
 * Builds a type builder from a GraphQL schema
 *
 * @param schema The GraphQL schmea to use
 * @returns A type builder export function that accepts a DeepPick and returns a
 * TypeScript type for the DeepPick and the provided schema
 */
export function buildTypeBuilder(
	schema: GraphQLSchema,
): (pick: DeepPick) => ts.TypeReferenceNode {
	return function(pick: DeepPick) {
		return ts.createTypeReferenceNode('GraphQLQueryString', [
			entriesToTypeLiteral(pick, schema.getQueryType().getFields()),
		]);
	};
}

/**
 * Helper method for less verbose property signature creation.
 *
 * @param name The name for the property signature
 * @param type The type node for the property signature
 * @returns A TypeScript PropertySignature
 */
export function propertySignature(
	name: string,
	type: ts.TypeNode,
): ts.PropertySignature {
	return ts.createPropertySignature(
		undefined,
		name,
		undefined,
		type,
		undefined,
	);
}

/**
 * Converts a basic GraphQL type to a TypeScript TypeNode.
 *
 * In this context, "basic" means a type that decomposes into a non-object
 * type in TypeScript. For example:
 *
 * Basic Types: string, number[], boolean | string
 * Complex Types: { a: string }, { b: number }[]
 *
 * @param type The type to convert
 * @returns A TypeScript TypeNode
 */
export function basicGraphQlTypeToTypeNode(type: GraphQLType): ts.TypeNode {
	if (type instanceof GraphQLScalarType) {
		return tsTypeFromGraphQLScalarType(type);
	} else if (type instanceof GraphQLEnumType) {
		return ts.createUnionTypeNode(
			type
				.getValues()
				.map(({ name }) => ts.createLiteralTypeNode(ts.createLiteral(name))),
		);
	} else if (type instanceof GraphQLList) {
		return ts.createArrayTypeNode(basicGraphQlTypeToTypeNode(type.ofType));
	} else if (type instanceof GraphQLNonNull) {
		// TODO - add support in output TS type for optional fields
		return basicGraphQlTypeToTypeNode(type.ofType);
	} else {
		throw `type is not a basic type`;
	}
}

/**
 * Converts a complex GraphQL type to a TypeScript TypeNode.
 *
 * In this context, "complex" means a type that decomposes into an
 * object type in TypeScript. For example:
 *
 * Basic Types: string, number[], boolean | string
 * Complex Types: { a: string }, { b: number }[]
 *
 * @param type The type to convert
 * @param pick The fields to pick
 * @returns A TypeScript TypeNode
 */
export function complexGraphQLTypeToTypeNode(
	type: GraphQLType,
	pick: DeepPick,
): ts.TypeNode {
	if (type instanceof GraphQLObjectType) {
		return tsTypeFromGraphQLObjectType(type, pick);
	} else if (type instanceof GraphQLUnionType) {
		throw 'Cannot yet parse union types';
	} else if (type instanceof GraphQLList) {
		return ts.createArrayTypeNode(
			complexGraphQLTypeToTypeNode(type.ofType, pick),
		);
	} else if (type instanceof GraphQLNonNull) {
		// TODO - add support in output TS type for optional fields
		return complexGraphQLTypeToTypeNode(type.ofType, pick);
	}
}

/**
 * Converts a GraphQL scalar type to a TypeScript TypeNode.
 *
 * @param type The GraphQL scalar type to convert
 * @returns A TypeScript TypeNode
 */
export function tsTypeFromGraphQLScalarType(
	type: GraphQLScalarType,
): ts.TypeNode {
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

/**
 * Converts a GraphQL object type into a TypeScript TypeNode.
 *
 * @param type The GraphQL object type to convert
 * @param pick The fields to pick
 * @returns A TypeScript TypeNode
 */
export function tsTypeFromGraphQLObjectType(
	type: GraphQLObjectType,
	pick: DeepPick,
): ts.TypeNode {
	return entriesToTypeLiteral(pick, type.getFields());
}

/**
 * Converts a set of fields and a pick into a TypeScript TypeLiteralNode.
 *
 * @param pick The fields to pick
 * @param fields The field map to pick from
 * @returns A type literal node
 */
export function entriesToTypeLiteral(
	pick: DeepPick,
	fields: GraphQLFieldMap<any, any>,
): ts.TypeLiteralNode {
	return ts.createTypeLiteralNode(
		Object.keys(pick).map(key =>
			propertySignature(key, entryToType(pick[key], fields[key])),
		),
	);
}

/**
 * Converts a GraphQL field into a TypeScript TypeNode using a provided pick specifier
 *
 * @param value Either true if this is a scalar field to pick or a DeepPick
 * representing the fields to pick.
 * @param field The field to pick from
 */
export function entryToType(
	value: true | DeepPick,
	field: GraphQLField<any, any, any>,
): ts.TypeNode {
	if (typeof value === 'boolean') {
		// Get the schema type
		return basicGraphQlTypeToTypeNode(field.type);
	}

	// Otherwise it's a more advanced type that we need to find and recurse
	return complexGraphQLTypeToTypeNode(field.type, value);
}
