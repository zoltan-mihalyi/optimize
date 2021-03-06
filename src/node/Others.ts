import EvaluationState = require("../tracking/EvaluationState");
import {ExpressionNode} from "./ExpressionNode";
import {SemanticNode} from "./SemanticNode";
import {PrimitiveValue, Value, IterableValue, ReferenceValue} from "../tracking/Value";
import {IdentifierNode} from "./IdentifierNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import Later = require("./Later");
import {isFunctionNode} from "../utils/Utils";
import {ArrowFunctionExpressionNode, FunctionNode} from "./Functions";
import {UnaryNode} from "./Operators";

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
        const object = this.object;
        object.track(state, visitor);
        this.property.track(state, visitor);

        if (!(object instanceof IdentifierNode)) {
            return;
        }

        if (!this.isReadOnly()) {
            return;
        }

        let objectValue = object.getValue();
        const propertyValue = this.getPropertyValue();
        if (propertyValue instanceof IterableValue) {
            if (objectValue instanceof IterableValue) {
                objectValue.each((obj) => {
                    if (!(obj instanceof ReferenceValue)) {
                        return;
                    }
                    let canMakeDirty = false;
                    propertyValue.each(p => {
                        const propName = p instanceof PrimitiveValue ?
                            p.value + ''
                            : state.dereference(p as ReferenceValue).trueValue + ''; //todo trueValue

                        if (!state.dereference(obj).isCleanAccess(state, propName)) {
                            canMakeDirty = true;
                        }
                    });
                    if (canMakeDirty) {
                        state.makeDirty(obj);
                    }
                });
            }
        } else {
            state.makeDirtyAll(object.getVariable());
        }
    }

    isReadOnly():boolean {
        if (this.parent instanceof Later.UpdateNode) {
            return false;
        }
        if (this.parent instanceof Later.AssignmentNode && this.parent.left === this) {
            return false;
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof UnaryNode && this.parent.isDelete()) {
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

    protected handleDeclarationsForNode() {
        const fn = this.getParent<FunctionNode>((node):node is FunctionNode => {
            return isFunctionNode(node) && !(node instanceof ArrowFunctionExpressionNode);
        });
        if (fn) {
            fn.usesThis = true;
        }
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
