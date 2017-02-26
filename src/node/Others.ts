import EvaluationState = require("../EvaluationState");
import {ExpressionNode} from "./ExpressionNode";
import {SemanticNode} from "./SemanticNode";
import {PrimitiveValue, Value, IterableValue, SingleValue, ReferenceValue} from "../Value";
import {IdentifierNode} from "./IdentifierNode";
import {TrackingVisitor} from "../NodeVisitor";
import Later = require("./Later");

export class EmptyNode extends SemanticNode {
    onTrack() {
    }
}

export class ExpressionStatementNode extends SemanticNode {
    expression:ExpressionNode;
    directive?:string;

    isDirective():boolean {
        return typeof this.directive === 'string';
    }

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.expression.track(state, visitor);
    }
}

export class MemberNode extends ExpressionNode {
    object:ExpressionNode;
    property:ExpressionNode;
    computed:boolean;

    protected isCleanInner():boolean {
        return false; //todo
    }

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.object.track(state, visitor);
        this.property.track(state, visitor);
    }

    isReadOnly():boolean {
        if (this.parent instanceof Later.UpdateNode) {
            return false;
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof Later.AssignmentNode && this.parent.left === this) {
            return false;
        }
        return true;
    }


    getPropertyValue():Value {
        return !this.computed ? new PrimitiveValue((this.property as IdentifierNode).name) : this.property.getValue();
    }
}
Later.MemberNode = MemberNode;

export class ThisNode extends ExpressionNode {
    protected isCleanInner():boolean {
        return true;
    }

    onTrack() {
    }
}

export class SequenceNode extends ExpressionNode {
    expressions:ExpressionNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        for (let i = 0; i < this.expressions.length; i++) {
            this.expressions[i].track(state, visitor);
        }
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.expressions.length; i++) {
            if (!this.expressions[i].isClean()) {
                return false;
            }
        }
        return true;
    }
}
