import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import EvaluationState = require("../tracking/EvaluationState");

export class IfNode extends SemanticNode {
    test:ExpressionNode;
    consequent:SemanticNode;
    alternate:SemanticNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.test.track(state, visitor);
        const consequentCtx = new EvaluationState(state, this.scope, this.context);
        this.consequent.track(consequentCtx, visitor);

        if (this.alternate) {
            const alternateCtx = new EvaluationState(state, this.scope, this.context);
            this.alternate.track(alternateCtx, visitor);
            state.mergeOr(consequentCtx, alternateCtx);
        } else {
            state.mergeMaybe(consequentCtx);
        }
    }
}

export class SwitchCaseNode extends SemanticNode {
    test:ExpressionNode;
    consequent:SemanticNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        if (this.test) {
            this.test.track(state, visitor);
        }
        for (let i = 0; i < this.consequent.length; i++) {
            this.consequent[i].track(state, visitor);
        }
    }
}

export class SwitchStatementNode extends SemanticNode {
    discriminant:ExpressionNode;
    cases:SwitchCaseNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.discriminant.track(state, visitor);
        state.trackAsUnsure(visitor, this.cases, false);
    }
}