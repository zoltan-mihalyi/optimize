import NodeVisitor = require("../NodeVisitor");
import EvaluationState = require("../EvaluationState");
import {FunctionDeclarationNode, BlockNode, ProgramNode, AbstractFunctionExpressionNode} from "../Nodes";
export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        track(node.body);
    });
    nodeVisitor.on(AbstractFunctionExpressionNode as any, (node:AbstractFunctionExpressionNode) => {
        if (node.body instanceof BlockNode) {
            track(node.body);
        }
    });
    nodeVisitor.on(ProgramNode, track);

    function track(block:BlockNode) {
        block.track(new EvaluationState(null, block.scope));
    }
};
