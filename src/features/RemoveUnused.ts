import NodeVisitor = require("../NodeVisitor");
import {VariableDeclaratorNode, FunctionDeclarationNode, ForEachNode, SemanticNode} from "../SemanticNode";
import {map} from "../Utils";
import {Variable} from "../Variable";
import recast = require("recast");

const builders = recast.types.builders;

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(VariableDeclaratorNode, (node:VariableDeclaratorNode) => {
        if (node.parent.parent instanceof ForEachNode) {
            return;
        }
        let variable = node.scope.get(node.id.name);
        if (canBeUsed(variable)) {
            return;
        }
        if (hasWriteWithoutDeclaration(variable)) {
            return;
        }

        const parentNode = node.parent;
        const index = parentNode.declarations.indexOf(node);
        const before = parentNode.declarations.slice(0, index);
        const after = parentNode.declarations.slice(index + 1);

        const result:Expression[] = [];
        if (before.length) {
            result.push(builders.variableDeclaration(parentNode.kind, map(before, node => node.toAst())));
        }
        if (node.init) {
            result.push(builders.expressionStatement(node.init.toAst()));
        }
        if (after.length) {
            result.push(builders.variableDeclaration(parentNode.kind, map(after, node => node.toAst())));
        }

        node.parent.replaceWith(result);
    });

    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        let variable = node.scope.get(node.id.name);
        if (!canBeUsed(variable)) {
            node.remove();
            return;
        }
        if (variable.global) {
            return;
        }
        if (!canBeCalled(node, [])) {
            node.remove();
        }
    });

    function hasWriteWithoutDeclaration(variable:Variable):boolean {
        let writes = variable.writes;
        for (let i = 0; i < writes.length; i++) {
            const write = writes[i];
            if (!(write.parent instanceof VariableDeclaratorNode)) {
                return true;
            }
        }
        return false;
    }

    function canBeUsed(variable:Variable):boolean {
        return variable.global || variable.reads.length > 0;
    }

    function canBeCalled(node:FunctionDeclarationNode, visited:FunctionDeclarationNode[]):boolean {
        if (visited.indexOf(node) !== -1) {
            return false;
        }
        visited.push(node);
        if (isGlobalScoped(node)) {
            return true;
        }
        let reads = node.id.scope.get(node.id.name).reads;
        for (let i = 0; i < reads.length; i++) {
            const read = reads[i];
            const fn = getEnclosingFunctionDeclaration(read);
            if (canBeCalled(fn, visited)) {
                return true;
            }
        }
        return false;
    }

    function isGlobalScoped(node:SemanticNode) {
        return getEnclosingFunctionDeclaration(node) === null;
    }

    function getEnclosingFunctionDeclaration(node:SemanticNode):FunctionDeclarationNode {
        let enclosingFunction = node.getEnclosingFunction();
        if (enclosingFunction === null) {
            return null;
        }
        if (enclosingFunction instanceof FunctionDeclarationNode) {
            return enclosingFunction;
        }
        return getEnclosingFunctionDeclaration(enclosingFunction);
    }
};