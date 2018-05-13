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

/**
 * Determines whether or not a node is a template literal
 * tagged with the provided tag.
 *
 * @param node The node to check
 * @param tag The tag to check for
 * @returns True if the node is tagged with the provided tag, false otherwise
 */
export function isTagged(node: ts.Node, tag: string): boolean {
	if (!node || !node.parent) {
		return false;
	}

	if (node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
		return false;
	}

	if (node.parent.kind !== ts.SyntaxKind.TaggedTemplateExpression) {
		return false;
	}

	const tagNode = node.parent as ts.TaggedTemplateExpression;

	return tagNode.tag.getText() === tag;
}
