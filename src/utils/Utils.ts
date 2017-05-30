import recast = require("recast");

const builders = recast.types.builders;
import {
    FiniteSetOfValues,
    HeapObject,
    IterableValue,
    PrimitiveValue,
    PropDescriptor,
    ReferenceValue,
    SingleValue,
    unknown,
    Value
} from "../tracking/Value";
import {SemanticNode} from "../node/SemanticNode";
import {CallNode, NewNode} from "../node/CallNodes";
import {Heap} from "./Variable";
import {FunctionNode} from "../node/Functions";
import {MemberNode} from "../node/Others";
import Cache = require("./Cache");
import Scope = require("../tracking/Scope");
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("../node/Later");

export interface InnerScoped extends SemanticNode {
    innerScope:Scope;
}

export function createUnusedName(base:string, isUsed:(name:string) => boolean) {
    let name = base;
    let i = 2;
    while (isUsed(name)) {
        name = base + i;
        i++;
    }
    return name;
}

export const binaryCache = new Cache<string, (x:any, y:any) => any>(operator => {
    return new Function('left,right', `return left ${operator} right;`) as (x:any, y:any) => any;
});

export function nonEnumerable(writable:boolean, configurable:boolean, value:Value):PropDescriptor {
    return {
        enumerable: false,
        writable: writable,
        configurable: configurable,
        value: value
    };
}

export function isPrimitive(value:any):value is number|string|boolean|null {
    if (value === null) {
        return true;
    }
    return typeof value !== 'object' && typeof value !== 'function';
}

export function throwValue(msg:string):Value {
    return unknown;
}

export function equals(a:any, b:any):boolean {
    return a === b || (a !== a && b !== b);
}

export function void0():Expression {
    return builders.unaryExpression('void', builders.literal(0));
}

export function canWrap(value:SingleValue):boolean {
    return value instanceof ReferenceValue || (value as PrimitiveValue).value != null;
}

export function isInnerScoped(node:SemanticNode):node is InnerScoped {
    return node !== null && hasOwnProperty(node, 'innerScope');
}

const hasOwnProp = Object.prototype.hasOwnProperty;
export function hasOwnProperty(object:Object, property:string):boolean {
    return hasOwnProp.call(object, property);
}

const MUTATING_METHODS:Function[] = [
    Array.prototype.pop,
    Array.prototype.push,
    Array.prototype.reverse,
    Array.prototype.sort,
    Array.prototype.shift,
    Array.prototype.unshift,
    Array.prototype.splice
];

const apply = Function.prototype.apply;
const call = Function.prototype.call;
const slice = Array.prototype.slice;

export function getRealFunctionAndContext(fn:Function, context:any, parameters:any[]):[Function, any] {
    if (isPrimitive(parameters)) {
        return [null, null];
    }
    if (fn === apply || fn === call) {
        const newParams = fn === call ? slice.call(parameters, 1) : parameters[1];
        return getRealFunctionAndContext(context, parameters[0], newParams);
    }
    return [fn, context];
}

export function getMutatingObject(fn:Function, context:any, parameters:any[]):any {
    [fn, context] = getRealFunctionAndContext(fn, context, parameters);
    return MUTATING_METHODS.indexOf(fn) !== -1 ? context : null;
}

export function getParameters(state:EvaluationState, node:CallNode|NewNode):any[] {
    const parameters = [];
    for (let i = 0; i < node.arguments.length; i++) {
        const argument = node.arguments[i];
        let parameter = argument.getValue();
        const trueValue = state.getTrueValue(parameter);
        if (trueValue) {
            parameters.push(trueValue.value);
        } else {
            return null;
        }
    }
    return parameters;
}

export function getClassName(value:Object) {
    let str = Object.prototype.toString.call(value);
    return str.substring(8, str.length - 1);
}

export function isValueUpdate(oldValue:Value, newValue:Value) { //todo
    if (oldValue.equals(newValue)) {
        return false;
    }
    if (oldValue instanceof ReferenceValue && newValue instanceof ReferenceValue) {
        return false;
    }
    if (oldValue instanceof FiniteSetOfValues && newValue instanceof FiniteSetOfValues && oldValue.size() === newValue.size()) {
        return false;
    }
    return true;
}

export function updateHeap(target:Heap, reference:ReferenceValue, heapObject:HeapObject) {
    if (target.has(reference)) {
        target.setOrUpdate(reference, target.get(reference).or(heapObject));
    } else {
        target.set(reference, heapObject);
    }
}

export function isFunctionNode(node:SemanticNode):node is FunctionNode {
    return node instanceof Later.FunctionDeclarationNode || node instanceof Later.AbstractFunctionExpressionNode;
}

export type HeapObjectModifier = (heapObject:HeapObject, property:string) => HeapObject;

export function handleMemberChange(state:EvaluationState, node:MemberNode, modifier:HeapObjectModifier) {
    const objectValue = node.object.getValue();
    if (objectValue instanceof IterableValue) {
        const isSingle = objectValue instanceof ReferenceValue;
        objectValue.each((singleValue) => {
            if (singleValue instanceof ReferenceValue) {
                const heapObject = state.dereference(singleValue);
                const newHeapObject = createModifiedObject(node, heapObject, modifier);
                state.updateObject(singleValue, isSingle ? newHeapObject : heapObject.or(newHeapObject));
            }
        });
    }
}

function createModifiedObject(left:MemberNode, heapObject:HeapObject, modifier:HeapObjectModifier):HeapObject {
    let newHeapObject:HeapObject = null;
    let hasUnknownProperty = false;
    const propertyValue = left.getPropertyValue();
    if (propertyValue instanceof IterableValue) {
        propertyValue.each(prop => {
            if (!hasUnknownProperty && prop instanceof PrimitiveValue) {
                let propertyName = prop.value + '';
                let modifiedHeapObject = modifier(heapObject, propertyName);

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
        newHeapObject = HeapObject.DIRTY_OBJECT;
    }
    return newHeapObject;
}

export function createMatchingObj<T extends Object>(object:T):T {
    const className = getClassName(object);

    if (className === 'Object') {
        return {} as any;
    } else if (className === 'Array') {
        return [] as any;
    } else {
        throw new Error(`${className} not supported!`);
    }
}