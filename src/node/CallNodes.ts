import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../NodeVisitor";
import {ReferenceValue, SingleValue} from "../Value";
import {canMutate, getParameters, canWrap} from "../Utils";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class CallNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

    protected afterTrack(state:EvaluationState, visitor:TrackingVisitor) {
        const callee = this.callee;

        if (callee instanceof Later.MemberNode) {
            let objectValue = callee.object.getValue();
            let calleeValue = callee.getValue();
            if (calleeValue instanceof ReferenceValue && objectValue instanceof SingleValue && canWrap(objectValue)) {
                const calleeObject = state.dereference(calleeValue);
                const objectObject = state.dereference(state.wrapReferenceValue(objectValue));
                if (calleeObject.trueValue) {
                    const parameters = getParameters(state, this);
                    if (parameters !== null && !canMutate(state, calleeObject.trueValue as Function, objectObject.trueValue, parameters)) {
                        return;
                    }
                }
            }

            state.makeDirtyAll(objectValue);
        }

        for (let i = 0; i < this.arguments.length; i++) {
            let obj = this.arguments[i];
            state.makeDirtyAll(obj.getValue());
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
