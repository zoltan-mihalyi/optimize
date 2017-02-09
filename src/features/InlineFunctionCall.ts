import NodeVisitor = require("../NodeVisitor");
import {
    CallNode,
    FunctionExpressionNode,
    SemanticNode,
    IdentifierNode,
    ExpressionStatementNode,
    LoopNode,
    ReturnNode
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
        if (callNode.getEnclosingFunction() === null && callee.innerScope.hasFunctionScopedVariables()) { //avoid global pollution
            return;
        }
        if (callee.innerScope.get('arguments').reads.length > 0) { //todo util
            return;
        }
        if (callNode.hasParent(node => node instanceof LoopNode)) {
            return;
        }
        if (callee.containsType(ReturnNode)) { //todo only in the function scope
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
                } else if (!variable.blockScoped && variable !== callNode.scope.get(name)) {
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
        let max = Math.max(calleeAst.params.length, callNode.arguments.length);
        for (let i = 0; i < max; i++) {
            if (calleeAst.params.length <= i) {
                body.push(builders.expressionStatement(callNode.arguments[i].toAst()));
                continue;
            }

            const paramId = calleeAst.params[i];
            let paramValue;
            if (callNode.arguments.length <= i) {
                paramValue = builders.unaryExpression('void', builders.literal(0)); //todo util
            } else {
                paramValue = callNode.arguments[i].toAst();
            }

            body.push(builders.variableDeclaration('var', [builders.variableDeclarator(paramId, paramValue)]));
        }
        body.push(...calleeAst.body.body);
        callNode.parent.replaceWith([builders.blockStatement(body)]);
    });
};