import NodeVisitor = require("../NodeVisitor");
import EvaluationState = require("../EvaluationState");
import {FunctionDeclarationNode, AbstractFunctionExpressionNode} from "../node/Functions";
import {SemanticNode} from "../node/SemanticNode";
import {ProgramNode} from "../node/Blocks";

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        track(node.body);
    });
    nodeVisitor.on(AbstractFunctionExpressionNode as any, (node:AbstractFunctionExpressionNode) => {
        track(node.body);
    });
    nodeVisitor.on(ProgramNode, track);

    function track(node:SemanticNode) {
        node.track(new EvaluationState(null, node.scope));
    }
};
