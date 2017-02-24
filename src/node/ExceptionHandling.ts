import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";
import EvaluationState = require("../EvaluationState");
import {unknown} from "../Value";
import {TrackingVisitor} from "../NodeVisitor";

export class CatchNode extends SemanticNode {
    param:IdentifierNode;
    body:BlockNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.body.track(state, visitor);
    }

    protected handleDeclarationsForNode() {
        this.body.scope.set(this.param.name, false, unknown).writes.push(this.param);
    }
}

export class ThrowNode extends SemanticNode {
    argument:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.argument.track(state, visitor);
    }
}

export class TryNode extends SemanticNode {
    block:BlockNode;
    handler:CatchNode;
    finalizer:BlockNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        state.trackAsUnsure(state => {
            this.block.track(state, visitor);
            if (this.handler) {
                this.handler.track(state, visitor);
            }
        });
        if (this.finalizer) {
            this.finalizer.track(state, visitor);
        }
    }
}