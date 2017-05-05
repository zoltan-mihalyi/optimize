import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class BinaryNode extends ExpressionNode {
    operator:string;
    left:ExpressionNode;
    right:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
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

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
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

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.left.track(state, visitor);
        const rightState = new EvaluationState(state, this.scope, this.context);
        this.right.track(rightState, visitor);
        state.mergeMaybe(rightState);
    }
}

export class UnaryNode extends ExpressionNode {
    argument:ExpressionNode;
    operator:string;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.argument.track(state, visitor);
    }

    protected isCleanInner():boolean {
        return (this.operator === 'void' || this.operator === 'typeof') && this.argument.isClean();
    }
}
Later.UnaryNode = UnaryNode;
