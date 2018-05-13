import * as ts from 'typescript';

import { isQueryString } from './index';

const toSourceFile = (text: string) =>
	ts.createSourceFile(
		'transient.ts',
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);

describe('isQueryString', () => {
	test('returns false when there is not a query string', () => {
		const source = toSourceFile('const str = "Hello, world!";');

		expect(isQueryString(source)).toBeFalsy();
	});

	test('returns truthy value when there is a query string', () => {
		const source = toSourceFile('const str = gql`{ name }`;');

		let found = false;

		const visitor = (node: ts.Node) => {
			console.log(ts.SyntaxKind[node.kind]);
			if (isQueryString(node)) {
				found = true;
			}

			return ts.forEachChild(node, visitor);
		};

		ts.visitNode(source, visitor);

		expect(found).toBeTruthy();
	});

	test('returns the query string when there is a query string', () => {
		const query = '{ name }';
		const text = `const str = gql\`${query}\`;`;
		const source = toSourceFile(text);

		let found: string | false;

		const visitor = (node: ts.Node) => {
			if (isQueryString(node)) {
				found = isQueryString(node);
			}

			return ts.forEachChild(node, visitor);
		};

		ts.visitNode(source, visitor);

		expect(found).toBe(query);
	});
});
