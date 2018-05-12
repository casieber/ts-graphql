import * as ts from 'typescript';

function visitor(ctx: ts.TransformationContext, sourceFile: ts.SourceFile) {
	const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		// here we can check each node and potentially return new nodes
		if (ts.isConditionalExpression(node) &&
			node.getChildAt(1, sourceFile).kind === ts.SyntaxKind.QuestionToken &&
			node.getChildAt(2, sourceFile).kind === ts.SyntaxKind.PropertyAccessExpression
		) {
			return ts.createBinary(
				node.getChildAt(0, sourceFile) as ts.Expression,
				ts.SyntaxKind.AmpersandAmpersandToken,
				ts.createPropertyAccess(
					node.getChildAt(0, sourceFile) as ts.Expression,
					node.getChildAt(2, sourceFile).getChildAt(2, sourceFile) as ts.Identifier,
				)
			)
		}

		if (ts.isCallExpression(node) &&
			node.expression.getText(sourceFile) == 'safely') {
				// Get the argument
				const target = node.arguments[0];

				// Check to make sure it is a proeprty access, like "a.b"
				if (ts.isPropertyAccessExpression(target)) {
					// return a binary expression with a && a.b
					return ts.createBinary(
						target.expression, // The left hand operand is the obejct
						ts.SyntaxKind.AmpersandAmpersandToken, // The && operator
						target, // The right hand operand is the full expression
					);
				}
			}

		// if we want to leave the node as is, and
		// continue searching through child nodes:
		return ts.visitEachChild(node, visitor, ctx);
	};

	return visitor;
}

export default function (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
	return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visitor(context, sourceFile));
}



const logVisitorForContext = (context: ts.TransformationContext) => {
	const logVisitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		console.log(ts.SyntaxKind[node.kind]);
		try { console.log(node.getText()); } catch(e) {}
		return ts.visitEachChild(node, logVisitor, context);
	}

	return logVisitor;
}

export function before(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
	const logVisitor = logVisitorForContext(context);
	
	const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
		if (ts.isTaggedTemplateExpression(node) && node.tag.getText() === 'withEval') {
			if (node.template.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
				// Transform the string into code
				const sf =  ts.createSourceFile('withEval', node.template.text, ts.ScriptTarget.ES2015, true);
				const block = ts.createBlock(sf.statements, true);
				const fn = ts.createFunctionExpression(undefined, undefined, undefined, undefined, [], null, block);
				const call = ts.createCall(fn, undefined, []);
				
				return ts.visitEachChild(call, visitor, context);
			} else {
				// Can't yet support tagged template literals
			}
		}

		return ts.visitEachChild(node, visitor, context);
	};

	return (sourceFile: ts.SourceFile) => {
		const result = ts.visitNode(sourceFile, visitor);

		ts.visitNode(result, logVisitor);

		return result;
	};
}

// export function after(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {

// }