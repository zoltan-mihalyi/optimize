import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");

export class CallNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class NewNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    protected isCleanInner():boolean {
        return false;
    }

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

}
