import EvaluationState = require("../EvaluationState");
import {AbstractFunctionExpressionNode, FunctionDeclarationNode} from "../node/Functions";
import {SemanticNode} from "../node/SemanticNode";
import {ProgramNode} from "../node/Blocks";
import {NodeVisitor, TrackingVisitor} from "../NodeVisitor";

export = (nodeVisitor:NodeVisitor, trackingVisitor:TrackingVisitor) => {
    nodeVisitor.onStart(node => trackingVisitor.callStart(node));
    nodeVisitor.onEnd(node => trackingVisitor.callEnd(node));

    nodeVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => track(node.body));
    nodeVisitor.on(AbstractFunctionExpressionNode as any, (node:AbstractFunctionExpressionNode) => track(node.body));
    nodeVisitor.on(ProgramNode, track);

    function track(node:SemanticNode) {
        const evaluationState = new EvaluationState(null, node.scope, node.context);
        node.track(evaluationState, trackingVisitor);
        evaluationState.addPossibleValuesToScope();
    }
};
