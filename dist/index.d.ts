import * as ts from 'typescript';
export default function (context: ts.TransformationContext): ts.Transformer<ts.SourceFile>;
export declare function before(context: ts.TransformationContext): ts.Transformer<ts.SourceFile>;
