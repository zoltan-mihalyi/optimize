import {BlockNode} from "../../node/Blocks";
import {VariableDeclarationNode} from "../../node/Variables";
import {NodeVisitor} from "../../utils/NodeVisitor";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(BlockNode, (node:BlockNode) => {
        const body = node.body;
        for (let i = 0; i < body.length; i++) {
            const expression = body[i];
            if (expression instanceof VariableDeclarationNode && expression.isBlockScoped()) {
                return;
            }
        }
        if (node.parent instanceof BlockNode) {
            const bodyAsExpressions:Expression[] = [];
            for (let i = 0; i < body.length; i++) {
                bodyAsExpressions.push(body[i].toAst());
            }
            node.replaceWith(bodyAsExpressions);
        }
    });
};