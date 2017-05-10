import {SemanticNode} from "./SemanticNode";
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");

export class BreakNode extends SemanticNode {
    onTrack() {
    }
}
Later.BreakNode = BreakNode;

export class ContinueNode extends SemanticNode {

    onTrack() {
    }
}
Later.ContinueNode = ContinueNode;

export class LabeledNode extends SemanticNode {
    label:IdentifierNode;
    body:SemanticNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        state.trackAsUnsure(visitor, [this.body], true);
    }
}
Later.LabeledNode = LabeledNode;

export class ReturnNode extends SemanticNode {
    argument:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        if (this.argument) {
            this.argument.track(state, visitor);
        }
    }
}
Later.ReturnNode = ReturnNode;