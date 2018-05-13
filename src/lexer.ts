/**
 * This file contains utilities for transforming a raw GraphQL query string
 * into a DeepPick, which is nothing but a "dumb" object representing the
 * overall shape of the end result but without any type information attached.
 *
 * I've grouped these utilities together under the name of 'lexer' because if
 * you make the analogy of this transformer to the standard steps of a compiler,
 * this step of going from raw input to a slightly better, although not fully
 * fledged, understanding of the raw input maps pretty well onto a compiler's
 * lexer.
 */

import {
	DocumentNode,
	OperationDefinitionNode,
	SelectionSetNode,
	FieldNode,
	FragmentSpreadNode,
	InlineFragmentNode,
} from 'graphql';

import { DeepPick } from './types';

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
