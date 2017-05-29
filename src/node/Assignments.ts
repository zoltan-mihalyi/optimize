import {ExpressionNode} from "./ExpressionNode";
import {binaryCache, handleMemberChange} from "../utils/Utils";
import {PrimitiveValue, SingleValue, unknown, Value} from "../tracking/Value";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {MemberNode} from "./Others";
import {IdentifierNode} from "./IdentifierNode";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");

type GetNewValue = (original:Value) => Value;


function trackAssignment(state:EvaluationState, node:ExpressionNode, getNewValue:GetNewValue) {
    if (!(node instanceof Later.IdentifierNode)) {
        handleMemberChange(state, node as MemberNode, (heapObject, propertyName) => {
            let previousValue = heapObject.resolveProperty(state, propertyName, heapObject.trueValue); //todo trueValue
            let newValue = getNewValue(previousValue);
            return heapObject.withProperty(propertyName, newValue, state);
        });
        return;
    }

    const variable = node.getVariable();
    const leftValue = state.getValue(variable);
    state.setValue(variable, getNewValue(leftValue), false);
}

export class AssignmentNode extends ExpressionNode {
    left:ExpressionNode;
    operator:string;
    right:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.left.track(state, visitor);
        this.right.track(state, visitor);
        const rightValue = this.right.getValue();

        trackAssignment(state, this.left, (leftValue:Value) => {
            if (this.operator === '=') {
                if (this.left instanceof IdentifierNode && this.right instanceof IdentifierNode) {
                    state.assign(this.left.getVariable(), this.right.getVariable());
                }
                return rightValue;
            }
            const evaluator = binaryCache.get(this.operator.substring(0, this.operator.length - 1));

            return leftValue.product(rightValue, (left:SingleValue, right:SingleValue) => {
                const leftTrueValue = state.getTrueValue(left);
                if (leftTrueValue) {
                    const rightTrueValue = state.getTrueValue(right);
                    if (rightTrueValue) {
                        return state.createValue(evaluator(leftTrueValue.value, rightTrueValue.value));
                    }
                }
                return unknown;
            });
        });

    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.left instanceof Later.IdentifierNode) {
            this.scope.getOrCreate(this.left.name).writes.push(this.left);
        }
    }
}
Later.AssignmentNode = AssignmentNode;

export class UpdateNode extends ExpressionNode {
    argument:ExpressionNode;
    operator:string;
    prefix:boolean;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.argument.track(state, visitor);

        trackAssignment(state, this.argument, (leftValue:Value) => {
            return leftValue.map((value:SingleValue) => {
                const trueValue = state.getTrueValue(value);
                if (trueValue) {
                    let numberValue:number = +trueValue.value;
                    return new PrimitiveValue(this.operator === '++' ? numberValue + 1 : numberValue - 1);
                } else {
                    return unknown;
                }
            });
        });
    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.argument instanceof Later.IdentifierNode) {
            this.scope.getOrCreate(this.argument.name).writes.push(this.argument);
        }
    }
}
Later.UpdateNode = UpdateNode;