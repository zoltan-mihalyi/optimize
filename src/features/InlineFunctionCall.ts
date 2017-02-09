import NodeVisitor = require("../NodeVisitor");
import {
    CallNode,
    FunctionExpressionNode,
    SemanticNode,
    IdentifierNode,
    ExpressionStatementNode,
    LoopNode,
    ReturnNode,
    SemanticExpression,
    LiteralNode
} from "../SemanticNode";
import {Variable} from "../Variable";
import {void0} from "../Utils";
import recast = require("recast");
import Map = require("../Map");

const builders = recast.types.builders;

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (callNode:CallNode) => {
        let callee = callNode.callee;
        if (!(callee instanceof FunctionExpressionNode)) {
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
            reduceExpression(returnExpression, callNode, callee);
        } else {
            reduceStatement(callNode, callee);
        }
    });

    function reduceStatement(callNode:CallNode, callee:FunctionExpressionNode) {
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
                paramValue = builders.unaryExpression('void', builders.literal(0)); //todo util
            } else {
                paramValue = callNode.arguments[i].toAst();
            }

            body.push(builders.variableDeclaration('var', [builders.variableDeclarator(paramId, paramValue)]));
        }
        body.push(...calleeAst.body.body);
        callNode.parent.replaceWith([builders.blockStatement(body)]);
    }

    function reduceExpression(returnExpression:SemanticExpression, callNode:CallNode, callee:FunctionExpressionNode) {
        let params = callee.params;
        const paramVars = params.map(param => param.scope.get(param.name));
        const ast = returnExpression.toAst((node:SemanticNode, expression:Expression) => {
            if (node instanceof IdentifierNode && node.isReal()) {
                const name = node.name;
                let variable = node.scope.get(name);
                let paramIndex = paramVars.indexOf(variable);
                if (paramIndex !== -1) {
                    return callNode.arguments.length >= paramIndex ? callNode.arguments[paramIndex].toAst() : void0();
                }
            }
            return expression;
        }) as any;

        callNode.replaceWith([ast]);
        return;
    }

    function canSubstituteParameters(node:CallNode, callee:FunctionExpressionNode) {
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            if (!isSimple(argument) && getUsages(callee.params[i]) > 1) {
                return false;
            }
        }
        return true;
    }

    function isSimple(argument:SemanticExpression):boolean {
        return argument instanceof IdentifierNode || argument instanceof LiteralNode;
    }

    function getUsages(id:IdentifierNode):number { //todo util
        let variable = id.scope.get(id.name);
        return variable.reads.length + variable.writes.length;
    }
};