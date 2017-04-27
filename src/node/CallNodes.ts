import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../NodeVisitor";
import {ReferenceValue, SingleValue, HeapObject} from "../Value";
import {getMutatingObject, getParameters, canWrap, isPrimitive, getClassName} from "../Utils";
import {IdentifierNode} from "./IdentifierNode";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");
import Map = require("../Map");

function clone(object:any, cloned:Map<Object,Object>) {//todo proto...
    if (isPrimitive(object)) {
        return object;
    }
    if (cloned.has(object)) {
        return cloned.get(object);
    }
    if (typeof object === 'function') {
        throw new Error('cloning function is not possible!');
    }
    let className = getClassName(object);

    let result:any;
    if (className === 'Object') {
        result = {};
    } else if (className === 'Array') {
        result = [];
    } else {
        throw new Error(`${className} not supported!`);
    }

    cloned.set(object, result);
    const propNames = Object.getOwnPropertyNames(object);
    for (let i = 0; i < propNames.length; i++) {
        const propName = propNames[i];
        result[propName] = clone(object[propName], cloned);
    }
    return result;
}

function applyFunctionCall(state:EvaluationState, objectValue:SingleValue, calleeObject:HeapObject,
                           objectObject:HeapObject, parameters:any[]):boolean {

    try {
        if (objectValue instanceof ReferenceValue) {
            const mutatingObject = getMutatingObject(calleeObject.trueValue as Function, objectObject.trueValue, parameters);
            if (mutatingObject) {
                const clonedObject = clone(mutatingObject, new Map<Object, Object>());
                let context = objectObject.trueValue;
                if (context === mutatingObject) {
                    context = clonedObject;
                } else {
                    parameters[0] = clonedObject;
                }

                state.createValueFromCall(calleeObject.trueValue as Function, context, parameters);

                state.updateObject(objectValue, state.dereference(state.getReferenceValue(clonedObject)));
            }
        }
        return true;
    } catch (e) {
        //no problem
    }
    return false;
}

export class CallNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

    protected afterTrack(state:EvaluationState, visitor:TrackingVisitor) {
        const callee = this.callee;

        if (callee instanceof Later.MemberNode) {
            let object = callee.object;
            let objectValue = object.getValue();
            let calleeValue = callee.getValue();
            if (calleeValue instanceof ReferenceValue && objectValue instanceof SingleValue && canWrap(objectValue)) {
                const calleeObject = state.dereference(calleeValue);
                const objectObject = state.dereference(state.wrapReferenceValue(objectValue));
                if (calleeObject.trueValue) {
                    const parameters = getParameters(state, this);
                    if (parameters !== null) {
                        if (applyFunctionCall(state, objectValue, calleeObject, objectObject, parameters)) {
                            return;
                        }
                    }
                }
            }

            if (object instanceof IdentifierNode) {
                state.makeDirtyAll(object.getVariable());
            }
        }

        for (let i = 0; i < this.arguments.length; i++) {
            let obj = this.arguments[i];
            if (obj instanceof IdentifierNode) {
                state.makeDirtyAll(obj.getVariable());
            }
        }
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class NewNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    protected isCleanInner():boolean {
        return false;
    }

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

}
