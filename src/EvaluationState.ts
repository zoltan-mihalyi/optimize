import {
    ARRAY,
    BOOLEAN,
    DIRTY_OBJECT, FunctionObjectClass,
    HeapObject,
    IterableValue,
    NUMBER,
    OBJECT,
    ObjectClass,
    PrimitiveValue,
    PropDescriptor,
    PropDescriptorMap,
    PropInfo,
    ReferenceValue,
    REG_EXP,
    SingleValue,
    STRING,
    unknown,
    Value
} from "./Value";
import {Heap, Variable} from "./Variable";
import {getClassName, hasOwnProperty, isPrimitive, nonEnumerable, throwValue} from "./Utils";
import Context from "./Context";
import {FunctionNode} from "./node/Functions";
import Map = require("./Map");
import Scope = require("./Scope");
import SafeProperties = require("./SafeProperties");
import Cache = require("./Cache");

const newCallCache = new Cache<number, Function>(paramNum => {
    let params:string[] = [];
    for (let i = 0; i < paramNum; i++) {
        params.push('p' + i);
    }
    let paramsString = params.join(',');
    return new Function(paramsString, 'return new this(' + paramsString + ')');
});

function getObjectClass(value:Object):ObjectClass {
    const className = getClassName(value);

    switch (className) {
        case 'Function':
            return new FunctionObjectClass(null);
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
    static rootState:EvaluationState = new EvaluationState(null, new Scope(null, false), null);

    private variableValues:Map<Variable, Value> = new Map<Variable, Value>();
    private heap:Heap = new Map<ReferenceValue, HeapObject>();
    private objectToReferenceMap:Map<Object, ReferenceValue> = new Map<Object, ReferenceValue>();
    private variableReferences:Map<Variable, ReferenceValue[]> = new Map<Variable, ReferenceValue[]>();
    private ownReferences:ReferenceValue[] = [];
    private updated:boolean = false;


    constructor(private parent:EvaluationState, private scope:Scope, readonly context:Context) {
        scope.each((name:string, variable:Variable) => {
            let value:Value;
            if (!(parent && parent.hasValue(variable))) {
                value = variable.initialValue ? variable.initialValue : unknown;
                variable.initialHeap.each((ref, obj) => {
                    if (!this.heap.has(ref)) {
                        this.heap.set(ref, obj);
                    }
                });
                this.setValue(variable, value);
            }
        });

        if (parent) {
            this.orWithVariableReferences(parent);
        }
    }

    setValue(variable:Variable, value:Value) {
        let variableFunctionScope = variable.scope.findFunctionScope();
        for (let i = 0; i < variable.writes.length; i++) {
            if (variable.writes[i].scope.findFunctionScope() !== variableFunctionScope) {
                return;
            }
        }
        let hasReadInAnotherScope = false;
        for (let i = 0; i < variable.reads.length; i++) {
            if (variable.reads[i].scope.findFunctionScope() !== variableFunctionScope) {
                hasReadInAnotherScope = true;
            }
        }

        if (value instanceof IterableValue) {
            const references:ReferenceValue[] = [];
            value.each(val => {
                if (val instanceof ReferenceValue) {
                    if (hasReadInAnotherScope) {
                        this.makeDirty(val);
                    }
                    references.push(val);
                }
            });
            this.updateReferences(variable, references);
        }

        this.variableValues.setOrUpdate(variable, value);
    }

    assign(variable:Variable, variable2:Variable) {
        if (!this.variableReferences.has(variable2)) {
            return;
        }
        this.updateReferences(variable, this.variableReferences.get(variable2));
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
            if (state2.heap.has(ref)) {
                this.heap.setOrUpdate(ref, heapObject.or(state2.dereference(ref)));
            } else {
                this.heap.setOrUpdate(ref, heapObject);
            }
        });
        state2.heap.each((reference, heapObject) => {
            if (!heap1.has(reference)) {
                this.orWithRef(reference, heapObject);
            }
        });

        state1.orWithVariableReferences(state2);
        this.replaceWithVariableReferences(state1);
    }

    mergeMaybe(state:EvaluationState) {
        state.variableValues.each((variable, value) => {
            this.orWith(variable, value);
        });

        state.heap.each((reference, heapObject) => {
            this.orWithRef(reference, heapObject);
        });

        this.orWithVariableReferences(state);
    }

    mergeBack(state:EvaluationState) {
        state.variableValues.each((variable:Variable, value:Value) => {
            if (this.hasValue(variable)) {
                this.variableValues.setOrUpdate(variable, value);
            }
        });

        state.heap.each((reference, heapObject) => {
            this.heap.setOrUpdate(reference, heapObject);
        });

        this.replaceWithVariableReferences(state);
    }

    trackAsUnsure(tracker:(state:EvaluationState) => void, loop:boolean) {
        const unsureState = new UnsureEvaluationState(this, this.scope, this.context);
        do {
            unsureState.updated = false;
            unsureState.ownReferences = [];
            tracker(unsureState);
        } while (loop && unsureState.updated);
        this.mergeMaybe(unsureState);
    }

    getValue(variable:Variable):Value {
        if (this.variableValues.has(variable)) {
            if (variable.global && !this.context.options.assumptions.noGlobalPropertyOverwrites) {
                return unknown;
            }
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

    createCustomFunctionReference(functionNode:FunctionNode):ReferenceValue {
        let properties:any = {};

        const fn = this.createFunctionValue(properties, functionNode);
        properties.prototype = nonEnumerable(this.createObject(OBJECT, new HeapObject({
            proto: this.getReferenceValue(Object.prototype),
            properties: {
                constructor: nonEnumerable(fn)
            },
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: null //todo
        })));

        return fn;
    }

    createFunctionValue(properties:PropDescriptorMap, functionNode:FunctionNode):ReferenceValue {
        (properties as any).arguments = nonEnumerable(unknown);
        (properties as any).caller = nonEnumerable(unknown);
        (properties as any).length = nonEnumerable(new PrimitiveValue(functionNode.params.length));

        return this.createObject(new FunctionObjectClass(functionNode), new HeapObject({
            proto: this.getReferenceValue(Function.prototype),
            properties: properties,
            propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE,
            trueValue: null
        }));
    }

    updateObject(reference:ReferenceValue, heapObject:HeapObject) {
        this.heap.setOrUpdate(reference, heapObject);
    }

    createObject(objectClass:ObjectClass, heapObject:HeapObject):ReferenceValue {
        const reference = new ReferenceValue(objectClass);
        this.ownReferences.push(reference);
        this.heap.set(reference, heapObject);
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

        const result = this.createObject(getObjectClass(object), new HeapObject({
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

    makeDirty(reference:ReferenceValue) {
        this.updateObject(reference, DIRTY_OBJECT);
    }

    makeDirtyAll(variable:Variable) {
        const references = this.getVariableReference(variable);

        for (let i = 0; i < references.length; i++) {
            this.makeDirty(references[i]);
        }
    }

    eachVariableReference(variable:Variable, callback:(ref:ReferenceValue) => void) {
        const references = this.getVariableReference(variable);

        for (let i = 0; i < references.length; i++) {
            callback(references[i]);
        }
    }

    private isOwn(reference:ReferenceValue):boolean {
        if (this.ownReferences.indexOf(reference) !== -1) {
            return true;
        }
        if (this.parent) {
            return this.parent.isOwn(reference);
        }
        return false;
    }

    private updateReferences(variable:Variable, references:ReferenceValue[]) {
        if (this.variableReferences.has(variable)) {
            const target = this.variableReferences.get(variable);
            const originalLength = target.length;

            //remove old references after multiple tracks
            for (let i = 0; i < target.length; i++) {
                const reference = target[i];
                if (!this.isOwn(reference)) {
                    target.splice(i, 1);
                    i--;
                }
            }

            //add new references
            for (let i = 0; i < references.length; i++) {
                const reference = references[i];
                if (target.indexOf(reference) === -1) {
                    target.push(reference);
                }
            }

            if (target.length !== originalLength) {
                this.updated = true;
            }
        } else {
            this.variableReferences.set(variable, references.slice());
        }
    }

    private getVariableReference(variable:Variable):ReferenceValue[] {
        if (this.variableReferences.has(variable)) {
            return this.variableReferences.get(variable);
        }
        if (this.parent) {
            return this.parent.getVariableReference(variable);
        }
        return [];
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
        let newObject = this.hasReference(reference) ? this.dereference(reference).or(heapObject) : heapObject;
        this.heap.setOrUpdate(reference, newObject);
    }

    private orWithVariableReferences(other:EvaluationState) {
        other.variableReferences.each((variable, references) => {
            this.updateReferences(variable, references);
        });
    }

    private replaceWithVariableReferences(other:EvaluationState) {
        const target = this.variableReferences;
        other.variableReferences.each((variable, references) => {
            if (!target.has(variable) || target.get(variable).length !== references.length) {
                this.updated = true;
            }
            target.setOrUpdate(variable, references);
        });
    }
}

class UnsureEvaluationState extends EvaluationState {
    getValue() {
        return unknown;
    }
}

SafeProperties.each(obj => EvaluationState.rootState.getReferenceValue(obj));

export = EvaluationState;