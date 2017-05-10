import {ExpressionStatementNode} from "../../node/Others";
import {NodeVisitor} from "../../utils/NodeVisitor";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(ExpressionStatementNode, (node:ExpressionStatementNode) => {
        if (node.expression.isClean() && !node.isDirective()) {
            node.remove();
        }
    });
};