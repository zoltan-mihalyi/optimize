import NodeVisitor = require("../NodeVisitor");
import {
    CallNode,
    AbstractFunctionExpressionNode,
    SemanticNode,
    IdentifierNode,
    ExpressionStatementNode,
    LoopNode,
    ReturnNode,
    SemanticExpression,
} from "../SemanticNode";
import {Variable} from "../Variable";
import {void0} from "../Utils";
import recast = require("recast");
import Map = require("../Map");

const builders = recast.types.builders;

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (callNode:CallNode) => {
        let callee = callNode.callee;
        if (!(callee instanceof AbstractFunctionExpressionNode)) {
            return;
        }

        const returnExpression = callee.getReturnExpression();
        const canReduceToExpression = returnExpression && canSubstituteParameters(callNode, callee);

        if (callee.innerScope.get('arguments').reads.length > 0) { //todo util
            return;
        }
        if (callNode.hasParent(node => node instanceof LoopNode)) {
            return;
        }

        if (canReduceToExpression) {
            reduceExpression(returnExpression, callNode);
        } else {
            reduceStatement(callNode, callee);
        }
    });

    function reduceStatement(callNode:CallNode, callee:AbstractFunctionExpressionNode) {
        if (!(callNode.parent instanceof ExpressionStatementNode)) {
            return;
        }
        if (callee.containsType(ReturnNode)) { //todo only in the function scope
            return;
        }
        if (callNode.getEnclosingFunction() === null && callee.innerScope.hasFunctionScopedVariables()) { //avoid global pollution
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
                paramValue = void0();
            } else {
                paramValue = callNode.arguments[i].toAst();
            }

            body.push(builders.variableDeclaration('var', [builders.variableDeclarator(paramId, paramValue)]));
        }
        body.push(...calleeAst.body.body);
        callNode.parent.replaceWith([builders.blockStatement(body)]);
    }

    function reduceExpression(returnExpression:SemanticExpression, callNode:CallNode) {
        callNode.replaceWith([returnExpression.toAst()]);
    }

    function canSubstituteParameters(node:CallNode, callee:AbstractFunctionExpressionNode) {
        if (callee.params.length > 0) {
            return false;
        }
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            if (!argument.isClean()) {
                return false;
            }
        }
        return true;
    }
};