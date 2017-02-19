import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";
import EvaluationState = require("../EvaluationState");

export class CatchNode extends SemanticNode {
    param:IdentifierNode;
    body:BlockNode;

    track(state:EvaluationState) {
        this.body.track(state);
    }
}

export class ThrowNode extends SemanticNode {
    argument:ExpressionNode;

    track(state:EvaluationState) {
        this.argument.track(state);
    }
}

export class TryNode extends SemanticNode {
    block:BlockNode;
    handler:CatchNode;
    finalizer:BlockNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.block.track(state);
            if (this.handler) {
                this.handler.track(state);
            }
        });
        if (this.finalizer) {
            this.finalizer.track(state);
        }
    }
}