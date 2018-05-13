import * as ts from 'typescript';

/**
 * Development utility function for throwing that
 * something has not yet been implemented.
 *
 * @param args Any arguments that will be swallowed up
 */
export const notImplemented = (...args: any[]) => {
	throw new Error('Not Implemented');
};

/**
 * Converts a Node into a pretty-printed string.
 *
 * @param node The node to convert
 * @returns The string representation of the Node
 */
export function getNodeString(node: ts.Node): string {
	const transientFile = ts.createSourceFile(
		'transientFile.ts',
		'',
		ts.ScriptTarget.Latest,
		false,
		ts.ScriptKind.TS,
	);

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const result = printer.printNode(
		ts.EmitHint.Unspecified,
		node,
		transientFile,
	);

	return result;
}

/**
 * Pretty prints a Node to the console.
 *
 * @param node The node to log
 */
export function logNode(node: ts.Node): void {
	console.log(getNodeString(node));
}
