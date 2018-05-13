import * as ts from 'typescript';

import { notImplemented } from './utils';

const isQueryExecution = notImplemented;
const isQueryString = notImplemented;
const injectQueryExecutionWithType = notImplemented;
const injectQueryStringWithType = notImplemented;

export function before(
	context: ts.TransformationContext,
): ts.Transformer<ts.SourceFile> {
	const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		if (isQueryString(node)) {
			// Encode the type information into the query string
			return injectQueryStringWithType(node);
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
