import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";
import {unknown} from "../Value";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");

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
        const nodes:SemanticNode[] = [this.block];
        if (this.handler) {
            nodes.push(this.handler);
        }
        state.trackAsUnsure(visitor, nodes, false);
        if (this.finalizer) {
            this.finalizer.track(state, visitor);
        }
    }
}