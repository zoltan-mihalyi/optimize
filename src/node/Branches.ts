import {SemanticNode} from "./SemanticNode";
import EvaluationState = require("../EvaluationState");
import {ExpressionNode} from "./ExpressionNode";

export class IfNode extends SemanticNode {
    test:ExpressionNode;
    consequent:SemanticNode;
    alternate:SemanticNode;

    track(state:EvaluationState) {
        this.test.track(state);
        const consequentCtx = new EvaluationState(state, this.scope);
        this.consequent.track(consequentCtx);

        if (this.alternate) {
            const alternateCtx = new EvaluationState(state, this.scope);
            this.alternate.track(alternateCtx);
            state.mergeOr(consequentCtx, alternateCtx);
        } else {
            state.mergeMaybe(consequentCtx);
        }
    }
}

export class SwitchCaseNode extends SemanticNode {
    test:ExpressionNode;
    consequent:SemanticNode[];

    track(state:EvaluationState) {
        if (this.test) {
            this.test.track(state);
        }
        for (let i = 0; i < this.consequent.length; i++) {
            this.consequent[i].track(state);
        }
    }
}

export class SwitchStatementNode extends SemanticNode {
    discriminant:ExpressionNode;
    cases:SwitchCaseNode[];

    track(state:EvaluationState) {
        this.discriminant.track(state);
        state.trackAsUnsure(state => {
            for (let i = 0; i < this.cases.length; i++) {
                this.cases[i].track(state);
            }
        });
    }
}