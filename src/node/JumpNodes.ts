import {SemanticNode} from "./SemanticNode";
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");
import {TrackingVisitor} from "../NodeVisitor";

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
        state.trackAsUnsure(state => this.body.track(state, visitor));
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