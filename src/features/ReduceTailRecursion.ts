import NodeVisitor = require("../NodeVisitor");
import {createUnusedName, void0} from "../Utils";
import {unknown} from "../Value";
import {SemanticNode} from "../node/SemanticNode";
import {FunctionDeclarationNode} from "../node/Functions";
import {CallNode} from "../node/CallNodes";
import {ReturnNode, LabeledNode} from "../node/JumpNodes";
import {IdentifierNode} from "../node/IdentifierNode";
import {LiteralNode} from "../node/Literal";
import {WhileNode} from "../node/Loops";
import {BlockNode} from "../node/Blocks";
import {VariableDeclarationNode} from "../node/Variables";
import Scope = require("../Scope");
import recast = require("recast");

const builders = recast.types.builders;

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (node:CallNode) => {
        const callee = node.callee;
        if (node.parent instanceof ReturnNode && callee instanceof IdentifierNode) {
            const enclosingFunction = node.getEnclosingFunction();
            if (!(enclosingFunction instanceof FunctionDeclarationNode)) {
                return;
            }
            if (!callee.refersToSame(enclosingFunction.id)) {
                return;
            }
            if (enclosingFunction.body.scope.get('arguments').reads.length > 0) {
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
            if (labelBody instanceof WhileNode && isTrue(labelBody.test) && labelBody.body instanceof BlockNode) {
                labelName = statement.label.name;
                hasWrappedBody = true;
            }
        }
    }
    if (!labelName) {
        labelName = createUnusedName('x', name => {
            return enclosingFunction.contains(node => node instanceof LabeledNode && node.label.name === name);
        });
    }

    node.parent.replaceWith([ //change params and goto
        ...swapVars(node.scope, enclosingFunction.params, node.arguments),
        ...resetUnsafeVars(enclosingFunction.body),
        builders.continueStatement(builders.identifier(labelName))
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

function resetUnsafeVars(block:BlockNode):Expression[] {
    const result:Expression[] = [];
    block.walk(node => {
        if (node instanceof VariableDeclarationNode && !node.isBlockScoped()) {
            const declarations = node.declarations;
            for (let i = 0; i < declarations.length; i++) {
                let variableName = declarations[i].id.name;
                result.push(builders.expressionStatement(
                    builders.assignmentExpression('=', builders.identifier(variableName), void0())
                ));
            }
        }
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
            scope.set(newName, false, unknown).reads.push(null); //todo

            let newParameter = newValues.length > i ? newValues[i].toAst() : void0();
            declarations.push(builders.variableDeclarator(builders.identifier(newName), newParameter));
            result.push(builders.expressionStatement(
                builders.assignmentExpression('=', param.toAst(), builders.identifier(newName))
            ));
        }
    }
    return result;
}