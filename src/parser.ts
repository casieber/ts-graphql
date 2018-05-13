/**
 * This file contains utilities for transforming a DeepPick into a fully
 * fledged TypeScript TypeNode, representing the output type of a GraphQL
 * operation.
 *
 * I've grouped these utilitis together under the name of 'parser' because if
 * you make the analogy of this transformer to the standard steps of a compiler,
 * this step of going from some intermediate to fully grasping the meaning.
 *
 * Not to mention the fact that this phase results in a TypeScript AST Node.
 */

import {
	GraphQLSchema,
	GraphQLType,
	GraphQLScalarType,
	GraphQLEnumType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLUnionType,
	GraphQLField,
	GraphQLFieldMap,
} from 'graphql';

import * as ts from 'typescript';

import { DeepPick } from './types';

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
