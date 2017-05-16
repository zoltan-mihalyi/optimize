import {void0} from "../../utils/Utils";
import {ReferenceValue, unknown} from "../../tracking/Value";
import {SemanticNode} from "../../node/SemanticNode";
import {FunctionDeclarationNode} from "../../node/Functions";
import {CallNode} from "../../node/CallNodes";
import {LabeledNode, ReturnNode} from "../../node/JumpNodes";
import {IdentifierNode} from "../../node/IdentifierNode";
import {LiteralNode} from "../../node/Literal";
import {WhileNode} from "../../node/Loops";
import {TrackingVisitor} from "../../utils/NodeVisitor";
import Scope = require("../../tracking/Scope");
import recast = require("recast");
import EvaluationState = require("../../tracking/EvaluationState");

const builders = recast.types.builders;

export  = (visitor:TrackingVisitor) => {
    visitor.on(CallNode, (node:CallNode, state:EvaluationState) => {
        const callee = node.callee;
        if (node.parent instanceof ReturnNode && callee instanceof IdentifierNode) {
            const enclosingFunction = node.getEnclosingFunction();
            if (!(enclosingFunction instanceof FunctionDeclarationNode)) {
                return;
            }
            const value = callee.getValue();

            if (!(value instanceof ReferenceValue) || value !== state.getValue(enclosingFunction.id.getVariable())) {
                return;
            }
            if (enclosingFunction.body.scope.hasArgumentsRead()) {
                return;
            }
            replaceRecursionWithGoto(node, enclosingFunction);
        }
    });
};

function isTrue(node:SemanticNode) {
    return node instanceof LiteralNode && !!node.value;
}

function replaceRecursionWithGoto(node:CallNode, enclosingFunction:FunctionDeclarationNode) {
    let body = enclosingFunction.body.body;

    let labelName;
    let hasWrappedBody = false;

    if (body.length === 1) {
        let statement = body[0];
        if (statement instanceof LabeledNode) {
            let labelBody = statement.body;
            if (labelBody instanceof WhileNode && isTrue(labelBody.test)) {
                labelName = statement.label.name;
                hasWrappedBody = true;
            }
        }
    }
    if (!labelName) {
        labelName = enclosingFunction.createUnusedLabel();
    }

    node.parent.replaceWith([
        builders.blockStatement([ //change params and goto
            ...swapVars(node.scope, enclosingFunction.params, node.arguments),
            ...resetUnsafeVars(enclosingFunction),
            builders.continueStatement(builders.identifier(labelName))
        ])
    ]);

    if (!hasWrappedBody) {

        let block = enclosingFunction.body.toAst() as any;
        block.body.push(builders.returnStatement(null));

        const newBody = builders.blockStatement([
            builders.labeledStatement(builders.identifier(labelName),
                builders.whileStatement(
                    builders.literal(1),
                    block
                )
            )
        ]);
        enclosingFunction.body.replaceWith([newBody]);
    }
}

function resetUnsafeVars(fn:FunctionDeclarationNode):Expression[] {
    const result:Expression[] = [];
    fn.innerScope.each((name, variable) => {
        if (variable.blockScoped || variable.reads.length === 0) {
            return;
        }
        for (let i = 0; i < fn.params.length; i++) {
            if (fn.params[i].name === name) {
                return;
            }
        }
        result.push(builders.expressionStatement(
            builders.assignmentExpression('=', builders.identifier(name), void0())
        ));
    });
    return result;
}

function swapVars(scope:Scope, vars:IdentifierNode[], newValues:SemanticNode[]):Expression[] {
    const result:Expression[] = [];
    if (vars.length) {
        let declarations:Expression[] = [];
        result.push(builders.variableDeclaration('var', declarations));
        for (let i = 0; i < vars.length; i++) {
            const param = vars[i];
            let newName = scope.createUnusedIdentifier('new_' + param.name);
            scope.set(newName, false, unknown);

            let newParameter = newValues.length > i ? newValues[i].toAst() : void0();
            declarations.push(builders.variableDeclarator(builders.identifier(newName), newParameter));
            result.push(builders.expressionStatement(
                builders.assignmentExpression('=', param.toAst(), builders.identifier(newName))
            ));
        }
    }
    return result;
}