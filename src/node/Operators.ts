import {ExpressionNode} from "./ExpressionNode";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class BinaryNode extends ExpressionNode {
    operator:string;
    left:ExpressionNode;
    right:ExpressionNode;

    track(state:EvaluationState) {
        this.left.track(state);
        this.right.track(state);
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class ConditionalNode extends ExpressionNode {
    test:ExpressionNode;
    consequent:ExpressionNode;
    alternate:ExpressionNode;

    track(state:EvaluationState) {
        this.test.track(state);
        const consequentCtx = new EvaluationState(state, this.scope);
        this.consequent.track(consequentCtx);
        const alternateCtx = new EvaluationState(state, this.scope);
        this.alternate.track(alternateCtx);
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
}

export class UnaryNode extends ExpressionNode {
    argument:ExpressionNode;
    operator:string;

    track(state:EvaluationState) {
        this.argument.track(state);
    }

    protected isCleanInner():boolean {
        return (this.operator === 'void' || this.operator === 'typeof') && this.argument.isClean();
    }
}
Later.UnaryNode = UnaryNode;
