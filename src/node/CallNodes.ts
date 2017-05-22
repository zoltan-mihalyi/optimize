import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {FunctionObjectClass, HeapObject, ReferenceValue, SingleValue} from "../tracking/Value";
import {canWrap, getClassName, getMutatingObject, getParameters, isPrimitive} from "../utils/Utils";
import {IdentifierNode} from "./IdentifierNode";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");
import Map = require("../utils/Map");

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

function applyFunctionCall(state:EvaluationState, objectValue:SingleValue, fn:Function,
                           objectObject:HeapObject, parameters:any[]):boolean {

    try {
        if (objectValue instanceof ReferenceValue) {
            const mutatingObject = getMutatingObject(fn, objectObject.trueValue, parameters);
            if (mutatingObject) {
                const clonedObject = clone(mutatingObject, new Map<Object, Object>());
                let context = objectObject.trueValue;
                if (context === mutatingObject) {
                    context = clonedObject;
                } else {
                    parameters[0] = clonedObject;
                }

                state.createValueFromCall(fn, context, parameters);

                state.updateObject(objectValue, state.dereference(state.getReferenceValue(clonedObject)));
            }
        }
        return true;
    } catch (e) {
        //no problem
    }
    return false;
}

export abstract class CallLikeNode extends ExpressionNode {
    callee:ExpressionNode;
    arguments:ExpressionNode[];

    protected isCleanInner():boolean {
        return false;
    }

    protected onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.callee.track(state, visitor);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state, visitor);
        }
    }

    protected afterTrack(state:EvaluationState) {
        for (let i = 0; i < this.arguments.length; i++) {
            const argument = this.arguments[i];
            if (argument instanceof IdentifierNode) {
                state.makeDirtyAll(argument.getVariable());
            }
        }
    }
}

export class CallNode extends CallLikeNode {
    protected afterTrack(state:EvaluationState) {
        const callee = this.callee;

        if (callee instanceof Later.MemberNode) {
            let object = callee.object;
            let objectValue = object.getValue();
            let calleeValue = callee.getValue();
            if (calleeValue instanceof ReferenceValue && objectValue instanceof SingleValue && canWrap(objectValue)) {
                const objectClass = calleeValue.objectClass;
                const objectObject = state.dereference(state.wrapReferenceValue(objectValue));
                if (objectClass instanceof FunctionObjectClass && objectClass.native) {
                    const parameters = getParameters(state, this);
                    if (parameters !== null) {
                        if (applyFunctionCall(state, objectValue, objectClass.native, objectObject, parameters)) {
                            return;
                        }
                    }
                }
            }

            if (object instanceof IdentifierNode) {
                state.makeDirtyAll(object.getVariable());
            }
        }

        super.afterTrack(state);
    }
}

export class NewNode extends CallLikeNode {
}
