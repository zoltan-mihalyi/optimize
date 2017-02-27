import {
    Value,
    unknown,
    SingleValue,
    ReferenceValue,
    HeapObject,
    PropDescriptorMap,
    PrimitiveValue,
    FUNCTION,
    OBJECT,
    PropInfo,
    ObjectClass,
    ARRAY,
    REG_EXP,
    STRING,
    BOOLEAN,
    NUMBER,
    PropDescriptor,
    IterableValue
} from "./Value";
import {Variable} from "./Variable";
import {nonEnumerable, hasOwnProperty, isPrimitive, throwValue} from "./Utils";
import Map = require("./Map");
import Scope = require("./Scope");
import SafeProperties = require("./SafeProperties");
import Cache = require("./Cache");

const newCallCache = new Cache<number,Function>(paramNum => {
    let params:string[] = [];
    for (let i = 0; i < paramNum; i++) {
        params.push('p' + i);
    }
    let paramsString = params.join(',');
    return new Function(paramsString, 'return new this(' + paramsString + ')');
});

function getObjectClass(value:Object):ObjectClass {
    let str = Object.prototype.toString.call(value);
    let className = str.substring(8, str.length - 1);

    switch (className) {
        case 'Function':
            return FUNCTION;
        case 'Array':
            return ARRAY;
        case 'RegExp':
            return REG_EXP;
        case 'String':
            return STRING;
        case 'Boolean':
            return BOOLEAN;
        case 'Number':
            return NUMBER;
        default:
            return OBJECT;
    }
}

class EvaluationState {
    private variableValues:Map<Variable,Value> = new Map<Variable,Value>();
    private heap:Map<ReferenceValue,HeapObject> = new Map<ReferenceValue,HeapObject>();
    private objectToReferenceMap:Map<Object,ReferenceValue> = new Map<Object,ReferenceValue>();

    static rootState:EvaluationState = new EvaluationState(null, new Scope(null, false));

    constructor(private parent:EvaluationState, private scope:Scope) {
        scope.each((name:string, variable:Variable) => {
            let value:Value;
            if (parent && parent.variableValues.has(variable)) {
            } else {
                value = variable.initialValue ? variable.initialValue : unknown;
                this.setValue(variable, value);
            }
        });
    }

    setValue(variable:Variable, value:Value) {
        let variableFunctionScope = variable.scope.findFunctionScope();
        for (let i = 0; i < variable.writes.length; i++) {
            if (variable.writes[i].scope.findFunctionScope() !== variableFunctionScope) {
                return;
            }
        }

        this.variableValues.setOrUpdate(variable, value);
    }

    mergeOr(state1:EvaluationState, state2:EvaluationState) {
        const map1 = state1.variableValues;
        state1.variableValues.each((variable, value) => {
            this.variableValues.setOrUpdate(variable, value.or(state2.getValue(variable)));
        });
        state2.variableValues.each((variable, value) => {
            if (!map1.has(variable)) {
                this.orWith(variable, value);
            }
        });

        const heap1 = state1.heap;
        state1.heap.each((ref, heapObject) => {
            if (state2.hasReference(ref)) {
                this.heap.setOrUpdate(ref, heapObject.or(state2.dereference(ref)));
            }
        });
        state2.heap.each((reference, heapObject) => {
            if (!heap1.has(reference)) {
                this.orWithRef(reference, heapObject);
            }
        });
    }

    mergeMaybe(state:EvaluationState) {
        state.variableValues.each((variable, value) => {
            this.orWith(variable, value);
        });

        state.heap.each((reference, heapObject) => {
            this.orWithRef(reference, heapObject);
        });
    }

    mergeBack(state:EvaluationState) {
        state.variableValues.each((variable:Variable, value:Value) => {
            if (this.hasValue(variable)) {
                this.variableValues.setOrUpdate(variable, value);
            }
        });

        state.heap.each((reference, heapObject) => {
            //TODO if (this.hasReference(reference)) {
            this.heap.setOrUpdate(reference, heapObject);
            // }
        });
    }

    trackAsUnsure(tracker:(state:EvaluationState) => void) {
        const unsureState = new UnsureEvaluationState(this, this.scope);
        tracker(unsureState);

        unsureState.variableValues.each((variable) => {
            this.variableValues.setOrUpdate(variable, unknown);
        });
    }

    getValue(variable:Variable):Value {
        if (this.variableValues.has(variable)) {
            return this.variableValues.get(variable);
        }
        if (this.parent) {
            return this.parent.getValue(variable);
        }
        return unknown;
    }

    hasValue(variable:Variable):boolean {
        if (this.variableValues.has(variable)) {
            return true;
        }
        if (this.parent) {
            return this.parent.hasValue(variable);
        }
        return false;
    }

    createCustomFunctionReference(length:number):ReferenceValue {
        let properties:any = {};

        const fn = this.createFunctionValue(properties, length);
        properties.prototype = nonEnumerable(this.saveObject(new HeapObject(OBJECT, {
            proto: this.getReferenceValue(Object.prototype),
            properties: {
                constructor: nonEnumerable(fn)
            },
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: null //todo
        })));

        return fn;
    }

    createFunctionValue(properties:PropDescriptorMap, length:number):ReferenceValue {
        (properties as any).arguments = nonEnumerable(unknown);
        (properties as any).caller = nonEnumerable(unknown);
        (properties as any).length = nonEnumerable(new PrimitiveValue(length));

        return this.saveObject(new HeapObject(FUNCTION, {
            proto: this.getReferenceValue(Function.prototype),
            properties: properties,
            propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE,
            trueValue: null
        }));
    }

    saveObject(heapObject:HeapObject, reference:ReferenceValue = new ReferenceValue()):ReferenceValue {
        this.heap.setOrUpdate(reference, heapObject);
        return reference;
    }

    hasReference(reference:ReferenceValue):boolean {
        if (this.heap.has(reference)) {
            return true;
        }
        if (this.parent) {
            return this.parent.hasReference(reference);
        }
        return false;
    }

    dereference(reference:ReferenceValue):HeapObject {
        if (this.heap.has(reference)) {
            return this.heap.get(reference);
        }
        return this.parent.dereference(reference);
    }

    createValue(value:any):SingleValue {
        if (isPrimitive(value)) {
            return new PrimitiveValue(value);
        } else {
            return this.getReferenceValue(value);
        }
    }

    getReferenceValue(object:Object):ReferenceValue {
        let referenceValue = this.getObjectReference(object);
        if (referenceValue !== null) {
            return referenceValue;
        }

        let properties:PropDescriptorMap = {};
        let proto = Object.getPrototypeOf(object);

        const result = this.saveObject(new HeapObject(getObjectClass(object), {
            proto: proto ? this.getReferenceValue(proto) : null,
            properties: properties,
            propertyInfo: SafeProperties.has(object) ? PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE : PropInfo.KNOWS_ALL,
            trueValue: object
        }));
        this.objectToReferenceMap.set(object, result);

        const propNames:string[] = SafeProperties.has(object) ? SafeProperties.get(object) : Object.getOwnPropertyNames(object);
        for (let i = 0; i < propNames.length; i++) {
            const propName = propNames[i];
            const propertyDescriptor = Object.getOwnPropertyDescriptor(object, propName);
            const propDescriptor:PropDescriptor = {
                enumerable: propertyDescriptor.enumerable
            };
            if (hasOwnProperty(propertyDescriptor, 'value')) {
                propDescriptor.value = this.createValue((object as any)[propName]);
            } else if (hasOwnProperty(propertyDescriptor, 'get')) {
                propDescriptor.get = this.createValue(propertyDescriptor.get) as ReferenceValue;
            }
            properties[propName] = propDescriptor;
        }
        return result;
    }

    createValueFromCall(fn:Function, context:any, parameters:any[]):Value {
        let callResult;
        try {
            callResult = Function.prototype.apply.call(fn, context, parameters);
        } catch (e) {
            return throwValue(`CALLING ${fn} WITH CONTEXT: ${context} AND PARAMETERS: ${parameters} THROWS ${e}`);
        }
        return this.createValue(callResult);
    }

    createValueFromNewCall(fn:Function, parameters:any[]):Value {
        return this.createValueFromCall(newCallCache.get(parameters.length), fn, parameters);
    }

    wrapReferenceValue(value:SingleValue):ReferenceValue {
        if (value instanceof PrimitiveValue) {
            return this.getReferenceValue(Object(value.value));
        } else {
            return value as ReferenceValue;
        }
    }

    isBuiltIn(key:Object):boolean {
        return EvaluationState.rootState.objectToReferenceMap.has(key);
    }

    makeDirtyAll(value:Value) {
        if (!(value instanceof IterableValue)) {
            return;
        }
        value.each((singleValue) => {
            if (singleValue instanceof ReferenceValue) {
                this.saveObject(this.dereference(singleValue).dirty(), singleValue);
            }
        });
    }

    private getObjectReference(object:Object):ReferenceValue {
        if (this.objectToReferenceMap.has(object)) {
            return this.objectToReferenceMap.get(object);
        }
        if (this.parent) {
            return this.parent.getObjectReference(object);
        }
        return null;
    }

    private orWith(variable:Variable, value:Value) {
        this.variableValues.setOrUpdate(variable, this.getValue(variable).or(value));
    }

    private orWithRef(reference:ReferenceValue, heapObject:HeapObject) {
        if (this.hasReference(reference)) {
            this.heap.setOrUpdate(reference, this.dereference(reference).or(heapObject));
        }
    }
}

class UnsureEvaluationState extends EvaluationState {
    getValue() {
        return unknown;
    }
}

SafeProperties.each(obj => EvaluationState.rootState.getReferenceValue(obj));

export = EvaluationState;