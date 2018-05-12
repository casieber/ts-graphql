"use strict";
exports.__esModule = true;
var ts = require("typescript");
function visitor(ctx, sourceFile) {
    var visitor = function (node) {
        // here we can check each node and potentially return new nodes
        if (ts.isConditionalExpression(node) &&
            node.getChildAt(1, sourceFile).kind === ts.SyntaxKind.QuestionToken &&
            node.getChildAt(2, sourceFile).kind === ts.SyntaxKind.PropertyAccessExpression) {
            return ts.createBinary(node.getChildAt(0, sourceFile), ts.SyntaxKind.AmpersandAmpersandToken, ts.createPropertyAccess(node.getChildAt(0, sourceFile), node.getChildAt(2, sourceFile).getChildAt(2, sourceFile)));
        }
        if (ts.isCallExpression(node) &&
            node.expression.getText(sourceFile) == 'safely') {
            // Get the argument
            var target = node.arguments[0];
            // Check to make sure it is a proeprty access, like "a.b"
            if (ts.isPropertyAccessExpression(target)) {
                // return a binary expression with a && a.b
                return ts.createBinary(target.expression, // The left hand operand is the obejct
                ts.SyntaxKind.AmpersandAmpersandToken, // The && operator
                target);
            }
        }
        // if we want to leave the node as is, and
        // continue searching through child nodes:
        return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
}
function default_1(context) {
    return function (sourceFile) { return ts.visitNode(sourceFile, visitor(context, sourceFile)); };
}
exports["default"] = default_1;
var logVisitorForContext = function (context) {
    var logVisitor = function (node) {
        console.log(ts.SyntaxKind[node.kind]);
        try {
            console.log(node.getText());
        }
        catch (e) { }
        return ts.visitEachChild(node, logVisitor, context);
    };
    return logVisitor;
};
function before(context) {
    var logVisitor = logVisitorForContext(context);
    var visitor = function (node) {
        if (ts.isTaggedTemplateExpression(node) && node.tag.getText() === 'withEval') {
            if (node.template.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
                // Transform the string into code
                var sf = ts.createSourceFile('withEval', node.template.text, ts.ScriptTarget.ES2015, true);
                var block = ts.createBlock(sf.statements, true);
                var fn = ts.createFunctionExpression(undefined, undefined, undefined, undefined, [], null, block);
                var call = ts.createCall(fn, undefined, []);
                return ts.visitEachChild(call, visitor, context);
            }
            else {
                // Can't yet support tagged template literals
            }
        }
        return ts.visitEachChild(node, visitor, context);
    };
    return function (sourceFile) {
        var result = ts.visitNode(sourceFile, visitor);
        ts.visitNode(result, logVisitor);
        return result;
    };
}
exports.before = before;
// export function after(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
// }
