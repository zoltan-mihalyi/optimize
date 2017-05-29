import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");
import {MemberNode} from "./Others";
import {handleMemberChange} from "../utils/Utils";

export class BinaryNode extends ExpressionNode {
    operator:string;
    left:ExpressionNode;
    right:ExpressionNode;

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.left.track(state, visitor);
        this.right.track(state, visitor);
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class ConditionalNode extends ExpressionNode {
    test:ExpressionNode;
    consequent:ExpressionNode;
    alternate:ExpressionNode;

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.test.track(state, visitor);
        const consequentCtx = new EvaluationState(state, this.scope, this.context);
        this.consequent.track(consequentCtx, visitor);
        const alternateCtx = new EvaluationState(state, this.scope, this.context);
        this.alternate.track(alternateCtx, visitor);
        state.mergeOr(consequentCtx, alternateCtx);
    }

    protected isCleanInner():boolean {
        return this.test.isClean() && this.consequent.isClean() && this.alternate.isClean();
    }
}

export class LogicalNode extends BinaryNode {
    isClean():boolean {
        return this.left.isClean() && this.right.isClean();
    }

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.left.track(state, visitor);
        const rightState = new EvaluationState(state, this.scope, this.context);
        this.right.track(rightState, visitor);
        state.mergeMaybe(rightState);
    }
}

export class UnaryNode extends ExpressionNode {
    argument:ExpressionNode;
    operator:string;

    isDelete():this is DeleteNode {
        return this.operator === 'delete';
    }

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.argument.track(state, visitor);
        if (this.isDelete()) {
            handleMemberChange(state, this.argument, (heapObject, propertyName) => {
                return heapObject.withoutProperty(propertyName);
            });
        }
    }

    protected isCleanInner():boolean {
        return (this.operator === 'void' || this.operator === 'typeof') && this.argument.isClean();
    }
}
Later.UnaryNode = UnaryNode;

interface DeleteNode extends UnaryNode {
    argument:MemberNode;
    operator:'delete';
}