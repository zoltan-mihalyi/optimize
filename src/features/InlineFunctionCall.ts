import NodeVisitor = require("../NodeVisitor");
import {
    CallNode,
    FunctionExpressionNode,
    SemanticNode,
    IdentifierNode,
    ExpressionStatementNode,
    LoopNode
} from "../SemanticNode";
import {Variable} from "../Variable";
import recast = require("recast");
import Map = require("../Map");

const builders = recast.types.builders;

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (callNode:CallNode) => {
        if (!(callNode.parent instanceof ExpressionStatementNode)) {
            return;
        }
        let callee = callNode.callee;
        if (!(callee instanceof FunctionExpressionNode)) {
            return;
        }
        if (callNode.hasParent(node => node instanceof LoopNode)) {
            return;
        }

        const rename:Map<Variable,string> = new Map<Variable,string>();
        let calleeAst = callee.toAst((node:SemanticNode, expression:Expression) => {
            if (node instanceof IdentifierNode && node.isReal()) {
                const name = node.name;
                let variable = node.scope.get(name);
                let newName:string;
                if (rename.has(variable)) {
                    newName = rename.get(variable);
                } else if (variable !== callNode.scope.get(name)) {
                    newName = callNode.scope.createUnusedIdentifier(name);
                    rename.set(variable, newName);
                }
                if (newName) {
                    (expression as any).name = newName;
                }
            }
            return expression;
        }) as any;

        const body:Expression[] = [];
        const declarations = [];
        for (let i = 0; i < calleeAst.params.length; i++) {
            const paramId = calleeAst.params[i];
            let paramValue;
            if (i < callNode.arguments.length) {
                paramValue = callNode.arguments[i].toAst();
            } else {
                paramValue = builders.unaryExpression('void', builders.literal(0));
            }
            declarations.push(builders.variableDeclarator(paramId, paramValue));
        }
        body.push(builders.variableDeclaration('var', declarations));
        for (let i = callee.params.length; i < callNode.arguments.length; i++) {
            body.push(builders.expressionStatement(callNode.arguments[i].toAst()));
        }
        body.push(...calleeAst.body.body);
        callNode.parent.replaceWith([builders.blockStatement(body)]);
    });
};