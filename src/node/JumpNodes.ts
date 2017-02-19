import {SemanticNode} from "./SemanticNode";
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class BreakNode extends SemanticNode {
    track() {
    }
}
Later.BreakNode = BreakNode;

export class ContinueNode extends SemanticNode {

    track() {
    }
}
Later.ContinueNode = ContinueNode;

export class LabeledNode extends SemanticNode {
    label:IdentifierNode;
    body:SemanticNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => this.body.track(state));
    }
}
Later.LabeledNode = LabeledNode;

export class ReturnNode extends SemanticNode {
    argument:ExpressionNode;

    track(state:EvaluationState) {
        if (this.argument) {
            this.argument.track(state);
        }
    }
}
Later.ReturnNode = ReturnNode;