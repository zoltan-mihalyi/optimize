import EvaluationState = require("../EvaluationState");
import {AbstractFunctionExpressionNode, FunctionDeclarationNode} from "../node/Functions";
import {SemanticNode} from "../node/SemanticNode";
import {ProgramNode} from "../node/Blocks";
import {NodeVisitor, TrackingVisitor} from "../NodeVisitor";

export = (nodeVisitor:NodeVisitor, trackingVisitor:TrackingVisitor) => {
    nodeVisitor.onStart(node => trackingVisitor.callStart(node));
    nodeVisitor.onEnd(node => trackingVisitor.callEnd(node));

    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        track(node.body, null);
    });
    nodeVisitor.on(AbstractFunctionExpressionNode as any, (node:AbstractFunctionExpressionNode) => {
        track(node.body, null);
    });
    nodeVisitor.on(ProgramNode, (node) => track(node, null));

    function track(node:SemanticNode, parentState:EvaluationState) {
        const evaluationState = new EvaluationState(parentState, node.scope, node.context);
        node.track(evaluationState, trackingVisitor);
        evaluationState.addPossibleValuesToScope();
    }
};
