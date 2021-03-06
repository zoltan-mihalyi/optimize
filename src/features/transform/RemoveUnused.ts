import {Variable} from "../../utils/Variable";
import {SemanticNode} from "../../node/SemanticNode";
import {FunctionDeclarationNode} from "../../node/Functions";
import {VariableDeclarationNode, VariableDeclaratorNode} from "../../node/Variables";
import {ForEachNode} from "../../node/Loops";
import {NodeVisitor} from "../../utils/NodeVisitor";
import recast = require("recast");

const builders = recast.types.builders;

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(VariableDeclarationNode, (declarationNode:VariableDeclarationNode) => {
        if (declarationNode.parent instanceof ForEachNode) {
            return;
        }

        const result:Expression[] = [];
        let currentDeclarations:Expression[] = null;
        let keepUnchanged = true;
        for (let i = 0; i < declarationNode.declarations.length; i++) {
            const node = declarationNode.declarations[i];

            const variable = node.id.getVariable();
            if (canBeUsed(variable) || canBeUsedThroughGlobalScope(variable, node) || hasWriteWithoutDeclaration(variable)) {
                if (currentDeclarations) {
                    currentDeclarations.push(node.toAst());
                } else {
                    currentDeclarations = [node.toAst()];
                }
            } else {
                keepUnchanged = false;
                if (node.init) {
                    flushDeclarations();
                    result.push(builders.expressionStatement(node.init.toAst()));
                }
            }
        }
        if (keepUnchanged) {
            return;
        }

        flushDeclarations();

        declarationNode.replaceWith(result);

        function flushDeclarations() {
            if (currentDeclarations) {
                result.push(builders.variableDeclaration(declarationNode.kind, currentDeclarations));
                currentDeclarations = null;
            }
        }
    });

    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        let variable = node.scope.get(node.id.name);
        if (canBeUsedThroughGlobalScope(variable, node)) {
            return;
        }
        if (!canBeUsed(variable)) {
            remove();
            return;
        }
        if (!canBeCalled(node, [])) {
            remove();
        }

        function remove() {
            node.replaceWith([builders.variableDeclaration('var', [
                builders.variableDeclarator(node.id.toAst(), null)
            ])]);
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
        return variable.reads.length > 0;
    }

    function canBeUsedThroughGlobalScope(variable:Variable, node:SemanticNode):boolean {
        return variable.global && !node.context.options.assumptions.noGlobalPropertyReads;
    }

    function canBeCalled(node:FunctionDeclarationNode, visited:FunctionDeclarationNode[]):boolean {
        if (visited.indexOf(node) !== -1) {
            return false;
        }
        visited.push(node);
        if (isGlobalScoped(node)) {
            return true;
        }
        const reads = node.id.getVariable().reads;
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