import {ExpressionNode} from "./ExpressionNode";
import EvaluationState = require("../EvaluationState");

export class CallNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    track(state:EvaluationState) {
        this.callee.track(state);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state);
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

    track(state:EvaluationState) {
        this.callee.track(state);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state);
        }
    }

}
