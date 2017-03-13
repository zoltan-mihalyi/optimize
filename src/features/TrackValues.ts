import EvaluationState = require("../EvaluationState");
import {FunctionDeclarationNode, AbstractFunctionExpressionNode} from "../node/Functions";
import {SemanticNode} from "../node/SemanticNode";
import {ProgramNode} from "../node/Blocks";
import {TrackingVisitor, NodeVisitor} from "../NodeVisitor";

export = (nodeVisitor:NodeVisitor, trackingVisitor:TrackingVisitor) => {
    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        track(node.body);
    });
    nodeVisitor.on(AbstractFunctionExpressionNode as any, (node:AbstractFunctionExpressionNode) => {
        track(node.body);
    });
    nodeVisitor.on(ProgramNode, track);

    function track(node:SemanticNode) {
        node.track(new EvaluationState(EvaluationState.rootState, node.scope, node.context), trackingVisitor);
    }
};
