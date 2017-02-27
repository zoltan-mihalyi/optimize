import {ExpressionNode} from "./ExpressionNode";
import {binaryCache, hasTrueValue, getTrueValue} from "../Utils";
import {SingleValue, unknown, PrimitiveValue, IterableValue, Value, ReferenceValue, HeapObject} from "../Value";
import {TrackingVisitor} from "../NodeVisitor";
import {MemberNode} from "./Others";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

type GetNewValue = (original:Value) => Value;


function trackAssignment(state:EvaluationState, node:ExpressionNode, getNewValue:GetNewValue) {
    if (!(node instanceof Later.IdentifierNode)) {
        handleMemberAssignment(state, node as MemberNode, getNewValue);
        return;
    }

    const leftValue = state.getValue(node.getVariable());
    state.setValue(node.getVariable(), getNewValue(leftValue));
}

function handleMemberAssignment(state:EvaluationState, node:MemberNode, getNewValue:GetNewValue) {
    const objectValue = node.object.getValue();
    if (objectValue instanceof IterableValue) {
        const isSingle = objectValue instanceof ReferenceValue;
        objectValue.each((singleValue) => {
            if (singleValue instanceof ReferenceValue) {
                const heapObject = state.dereference(singleValue);
                const newHeapObject = createModifiedObject(state, node, heapObject, getNewValue);
                state.saveObject(isSingle ? newHeapObject : heapObject.or(newHeapObject), singleValue);
            }
        });
    }
}

function createModifiedObject(state:EvaluationState, left:MemberNode, heapObject:HeapObject, getNewValue:GetNewValue):HeapObject {
    let newHeapObject:HeapObject = null;
    let hasUnknownProperty = false;
    const propertyValue = left.getPropertyValue();
    if (propertyValue instanceof IterableValue) {
        propertyValue.each(prop => {
            if (!hasUnknownProperty && prop instanceof PrimitiveValue) {
                let propertyName = prop.value + '';
                let previousValue = heapObject.resolveProperty(state, propertyName, heapObject.trueValue); //todo trueValue
                let newValue = getNewValue(previousValue);
                let modifiedHeapObject = heapObject.withProperty(propertyName, newValue);
                if (newHeapObject === null) {
                    newHeapObject = modifiedHeapObject;
                } else {
                    newHeapObject = newHeapObject.or(modifiedHeapObject);
                }
            } else {
                hasUnknownProperty = true;
            }
        });
    } else {
        hasUnknownProperty = true;
    }
    if (hasUnknownProperty) {
        newHeapObject = heapObject.dirty();
    }
    return newHeapObject;
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
                return rightValue;
            }
            const evaluator = binaryCache.get(this.operator.substring(0, this.operator.length - 1));

            return leftValue.product(rightValue, (left:SingleValue, right:SingleValue) => {
                if (hasTrueValue(left, state) && hasTrueValue(right, state)) {
                    return state.createValue(evaluator(getTrueValue(left, state), getTrueValue(right, state)));
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
                if (hasTrueValue(value, state)) {
                    let numberValue:number = +getTrueValue(value, state);
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