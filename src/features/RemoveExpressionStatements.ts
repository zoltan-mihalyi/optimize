import NodeVisitor = require("../NodeVisitor");
import {ExpressionStatementNode} from "../SemanticNode";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(ExpressionStatementNode, (node:ExpressionStatementNode) => {
        if (node.expression.isClean() && !node.isDirective()) {
            node.remove();
        }
    });
};