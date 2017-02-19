import NodeVisitor = require("../NodeVisitor");
import {ExpressionStatementNode} from "../Nodes";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(ExpressionStatementNode, (node:ExpressionStatementNode) => {
        if (node.expression.isClean() && !node.isDirective()) {
            node.remove();
        }
    });
};