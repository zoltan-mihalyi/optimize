import NodeVisitor = require("../NodeVisitor");
import {ExpressionStatementNode} from "../node/Others";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(ExpressionStatementNode, (node:ExpressionStatementNode) => {
        if (node.expression.isClean() && !node.isDirective()) {
            node.remove();
        }
    });
};