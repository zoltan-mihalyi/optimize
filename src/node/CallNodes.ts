import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {FunctionObjectClass, HeapObject, ReferenceValue, SingleValue} from "../tracking/Value";
import {canWrap, createMatchingObj, getMutatingObject, getParameters, isPrimitive} from "../utils/Utils";
import {IdentifierNode} from "./IdentifierNode";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");
import Map = require("../utils/Map");

function makeClone(object:any, cloned:Map<Object, Object>) {//todo proto...
    if (isPrimitive(object)) {
        return object;
    }
    if (cloned.has(object)) {
        return cloned.get(object);
    }
    if (typeof object === 'function') {
        throw new Error('cloning function is not possible!');
    }
    const result = createMatchingObj(object);

    cloned.set(object, result);
    for (const propName of Object.getOwnPropertyNames(object)) {
        result[propName] = makeClone(object[propName], cloned);
    }
    return result;
}

function makeCloneIfNeeded(mutatingObject:Object, object:any, cloned:Map<Object, Object>) {
    const visited:Object[] = [];

    if (needsClone(object)) {
        makeClone(object, cloned);
    }

    function needsClone(object:any) {
        if (object === mutatingObject) {
            return true;
        }
        if (isPrimitive(object)) {
            return false;
        }
        if (visited.indexOf(object) !== -1) {
            return false;
        }
        visited.push(object);
        for (const propName of Object.getOwnPropertyNames(object)) {
            if (needsClone(object[propName])) {
                return true;
            }
        }
    }
}

function substituteToCloned(clones:Map<Object, Object>, objects:any[]):any[] {
    const result = new Array(objects.length);
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        result[i] = clones.has(obj) ? clones.get(obj) : obj;
    }
    return result;
}

function applyFunctionCall(state:EvaluationState, objectValue:SingleValue, fn:Function,
                           objectObject:HeapObject, parameters:any[]):boolean {

    try {
        if (objectValue instanceof ReferenceValue) {
            const originalContext = objectObject.trueValue;
            const mutatingObject = getMutatingObject(fn, originalContext, parameters);
            if (mutatingObject) {
                const clones = new Map<Object, Object>();

                const contextAndParams = [originalContext, ...parameters];
                contextAndParams.forEach((object) => makeCloneIfNeeded(mutatingObject, object, clones));

                const clonedContextAndParams = substituteToCloned(clones, contextAndParams);

                state.createValueFromCall(fn, clonedContextAndParams[0], clonedContextAndParams.slice(1));

                state.updateTrueValues(clones);
            }
        }
        return true;
    } catch (e) {
        return false;
    }
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
