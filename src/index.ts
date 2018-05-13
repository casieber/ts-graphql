import * as ts from 'typescript';

import { parse } from 'graphql';

import { notImplemented } from './utils';
import { documentToType } from './lexer';
import { buildTypeBuilder } from './parser';

import { logNode } from './utils';

// TODO: This should eventually come from the user
import schema from './testSchema';

const pickToType = buildTypeBuilder(schema);

const isQueryExecution = notImplemented;
const isQueryString = notImplemented;
const injectQueryExecutionWithType = notImplemented;

function injectQueryStringWithType(node: ts.Node, queryStr: string) {
	const query = parse(queryStr);

	// Determine the selected items
	const selections = documentToType(query);

	// Transform selection into TypeScript type
	const typeNode = pickToType(selections);

	// Temporarily just log the node
	logNode(typeNode);

	return notImplemented();
}

export function before(
	context: ts.TransformationContext,
): ts.Transformer<ts.SourceFile> {
	const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		const queryStr = isQueryString(node);
		if (queryStr) {
			// Encode the type information into the query string
			return injectQueryStringWithType(node, queryStr);
		}

		if (isQueryExecution(node)) {
			// Encode the type unwrapping information into the query execution
			return injectQueryExecutionWithType(node);
		}

		// Otherwise, keep looking
		return ts.visitEachChild(node, visitor, context);
	};

	return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visitor);
}
