import {Variable} from "../../utils/Variable";
import {void0} from "../../utils/Utils";
import {ExpressionNode} from "../../node/ExpressionNode";
import {AbstractFunctionExpressionNode, ArrowFunctionExpressionNode, FunctionNode} from "../../node/Functions";
import {CallNode} from "../../node/CallNodes";
import {LoopNode} from "../../node/Loops";
import {ExpressionStatementNode} from "../../node/Others";
import {ReturnNode} from "../../node/JumpNodes";
import {IdentifierNode} from "../../node/IdentifierNode";
import {NodeVisitor} from "../../utils/NodeVisitor";
import {FunctionObjectClass, ReferenceValue} from "../../tracking/Value";
import {BlockNode} from "../../node/Blocks";
import {SemanticNode} from "../../node/SemanticNode";
import recast = require("recast");
import Map = require("../../utils/Map");
import Scope = require("../../tracking/Scope");

const builders = recast.types.builders;

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (callNode:CallNode) => {
        const value = callNode.callee.getValue();
        if (!(value instanceof ReferenceValue)) {
            return;
        }
        const objectClass = value.objectClass;
        if (!(objectClass instanceof FunctionObjectClass)) {
            return;
        }
        const fn = objectClass.fn;
        if (!fn) {
            return;
        }
        if (fn.callCount !== 1) {
            return;
        }

        const returnExpression = getReturnExpression(fn);
        const canReduceToExpression = returnExpression && canSubstituteParameters(callNode, fn);

        if (!(fn instanceof ArrowFunctionExpressionNode) && fn.innerScope.hasArgumentsRead()) {
            return;
        }
        if (callNode.hasParent(node => node instanceof LoopNode)) {
            return;
        }
        if (fn.usesThis) {
            return;
        }

        if (canReduceToExpression) {
            reduceExpression(returnExpression, callNode);
        } else {
            reduceStatement(callNode, fn);
        }
    });

    function reduceStatement(callNode:CallNode, fn:FunctionNode) {
        const parentNode = callNode.parent;
        const transformedReturn = fn.returns.length > 0;
        if (!(parentNode instanceof ExpressionStatementNode || parentNode instanceof ReturnNode)) { //todo more types
            return;
        }
        const enclosingFunction = callNode.getEnclosingFunction();
        if (enclosingFunction === null) { //avoid global pollution
            if (fn.innerScope.hasFunctionScopedVariables() || transformedReturn) {
                return;
            }
        }
        if ((enclosingFunction && enclosingFunction.isChanged()) || fn.isChanged()) {
             return;
        }

        const resultVar = fn.innerScope.createUnusedIdentifier('result');
        const exitLabel = fn.createUnusedLabel();

        function transform(node:SemanticNode, expression:Expression):Expression {
            if (node instanceof ReturnNode && fn.returns.indexOf(node) !== -1) {

                const result:Expression[] = [];

                if (node.argument) {
                    result.push(builders.expressionStatement(builders.assignmentExpression(
                        '=',
                        builders.identifier(resultVar),
                        node.argument.toAst()
                    )));
                }
                result.push(builders.breakStatement(builders.identifier(exitLabel)));

                return builders.blockStatement(result);
            }
            return expression;
        }

        const renamedFn = renameOrPrepare(fn, callNode, transform) as any;
        if (!renamedFn) {
            return;
        }
        const body:Expression[] = [];
        const max = Math.max(renamedFn.params.length, callNode.arguments.length);
        for (let i = 0; i < max; i++) {
            if (renamedFn.params.length <= i) {
                body.push(builders.expressionStatement(callNode.arguments[i].toAst()));
                continue;
            }

            const paramId = renamedFn.params[i];
            let paramValue;
            if (callNode.arguments.length <= i) {
                paramValue = void0();
            } else {
                paramValue = callNode.arguments[i].toAst();
            }

            body.push(builders.variableDeclaration('var', [builders.variableDeclarator(paramId, paramValue)]));
        }

        body.push(...renamedFn.body.body);
        if (transformedReturn) {
            body.unshift(builders.variableDeclaration('var', [builders.variableDeclarator(
                builders.identifier(resultVar),
                null
            )]));
        }
        let block = builders.blockStatement(body);
        if (transformedReturn) {
            block = builders.labeledStatement(builders.identifier(exitLabel), block);
        }
        parentNode.replaceWith([
            block,
            parentNode.toAst((node, expression) => {
                if (node === callNode) {
                    return transformedReturn ? builders.identifier(resultVar) : void0();
                }
                return expression;
            })
        ]);
    }

    function reduceExpression(returnExpression:ExpressionNode, callNode:CallNode) {
        const expression = renameOrPrepare(returnExpression, callNode);
        if (expression) {
            callNode.replaceWith([expression]);
        }
    }

    function canSubstituteParameters(node:CallNode, fn:FunctionNode) {
        if (fn.params.length > 0) {
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

function getReturnExpression(fn:FunctionNode):ExpressionNode {
    let body = fn.body;
    if (fn instanceof AbstractFunctionExpressionNode && fn.expression) {
        return body as ExpressionNode;
    } else if (body instanceof BlockNode && body.body.length === 1) {
        const statement = body.body[0];
        if (statement instanceof ReturnNode) {
            return statement.argument;
        }
    }
    return null;
}

type Transform = (node:SemanticNode, expression:Expression) => Expression;
function renameOrPrepare(inline:SemanticNode, callNode:CallNode, transform?:Transform):Expression {
    const fnRenames:Map<Variable, string> = new Map<Variable, string>();
    const callSiteRenames:Map<Variable, string> = new Map<Variable, string>();

    const expression = inline.toAst((node, expression) => {
        if (node instanceof IdentifierNode && node.isReal()) {
            const name = node.name;
            const fnVariable = node.scope.get(name);
            const callSiteVariable = callNode.scope.get(name);
            if (fnVariable !== callSiteVariable && callSiteVariable !== null) {
                if (fnVariable.scope.isAncestorOf(callSiteVariable.scope)) {
                    createName(callSiteRenames, callSiteVariable);
                } else {
                    (expression as any).name = createName(fnRenames, fnVariable);
                }
            }
        }
        return transform ? transform(node, expression) : expression;
    });
    if (!callSiteRenames.isEmpty()) {
        applyRenames(callSiteRenames, callNode);
        return null;
    }
    return expression;
}

function createName(renames:Map<Variable, string>, variable:Variable) {
    if (renames.has(variable)) {
        return renames.get(variable);
    } else {
        const name = variable.scope.createUnusedIdentifier(variable.name);
        renames.set(variable, name);
        return name;
    }
}

function applyRenames(renames:Map<Variable, string>, node:SemanticNode) {
    let parent = node;
    while (true) {
        if (isAllInside(parent.scope)) {
            break;
        }
        parent = parent.getParent(node => node instanceof BlockNode);
    }
    if (parent.isChanged()) {
        return;
    }

    const expression = parent.toAst(((n, e:any) => {
        if (n instanceof IdentifierNode && n.isReal()) {
            const variable = n.getVariable();
            if (renames.has(variable)) {
                e.name = renames.get(variable);
            }
        }
        return e;
    }));
    parent.replaceWith([expression]);

    function isAllInside(scope:Scope):boolean {
        let allInside = true;
        renames.each((variable) => {
            if (!scope.isAncestorOf(variable.scope)) {
                allInside = false;
            }
        });
        return allInside;
    }
}