import {createMatchingObj, equals, hasOwnProperty} from "../utils/Utils";
import {FunctionNode} from "../node/Functions";
import EvaluationState = require("./EvaluationState");

export let unknown:UnknownValue;

export abstract class Value {
    abstract map(mapper:(value:SingleValue) => Value):Value;

    abstract or(value:Value):Value;

    abstract product(other:Value, mapper:(left:SingleValue, right:SingleValue) => Value):Value;

    equals(other:Value):boolean {
        if (other.constructor === this.constructor) {
            return this.equalsInner(other as this);
        }
        return false;
    }

    protected abstract equalsInner(other:this):boolean;
}

export abstract class IterableValue extends Value {
    abstract each(callback:(value:SingleValue) => void):void;
}

export abstract class SingleValue extends IterableValue {
    or(value:Value):Value {
        if (value instanceof SingleValue) {
            return FiniteSetOfValues.create([this, value]);
        } else {
            return value.or(this);
        }
    }

    map(mapper:(value:SingleValue) => Value):Value {
        return mapper(this);
    }

    each(callback:(value:SingleValue) => void):void {
        callback(this);
    }

    product(other:Value, mapper:(left:SingleValue, right:SingleValue) => Value):Value {
        return other.map(rval => mapper(this, rval));
    }
}

export class PrimitiveValue extends SingleValue {
    constructor(public value:string | boolean | number) {
        super();
    }

    protected equalsInner(other:PrimitiveValue):boolean {
        return equals(this.value, other.value);
    }
}

export abstract class ObjectClass {
    abstract getTypeof():string;
}

export class FunctionObjectClass extends ObjectClass {
    constructor(readonly fn:FunctionNode, readonly native:Function) {
        super();
    }

    getTypeof():string {
        return 'function';
    }
}

class ObjectObjectClass extends ObjectClass {
    getTypeof():string {
        return 'object';
    }
}
export const OBJECT = new ObjectObjectClass();

class ArrayObjectClass extends ObjectObjectClass {
}
export const ARRAY = new ArrayObjectClass();

class NumberObjectClass extends ObjectObjectClass {
}
export const NUMBER = new NumberObjectClass();

class BooleanObjectClass extends ObjectObjectClass {
}
export const BOOLEAN = new BooleanObjectClass();

class StringObjectClass extends ObjectObjectClass {
}
export const STRING = new StringObjectClass();

class RegExpObjectClass extends ObjectObjectClass {
}
export const REG_EXP = new RegExpObjectClass();

class ArgumentsObjectClass extends ObjectObjectClass {
}
export const ARGUMENTS = new ArgumentsObjectClass();

export interface PropDescriptor {
    enumerable:boolean;
    writable:boolean;
    configurable:boolean;
    hiddenSetter?:boolean;
    value?:Value;
    get?:ReferenceValue;
    set?:ReferenceValue;
}

export interface PropDescriptorMap {
    [idx:string]:PropDescriptor;
}

interface PropInfo {
    readonly knowsAllEnumerable:boolean;
    readonly knowsAllOverride:boolean;
    readonly knowsAll:boolean;
}

export const MAY_HAVE_NEW:PropInfo = {knowsAll: false, knowsAllEnumerable: false, knowsAllOverride: false};
export const NO_UNKNOWN_OVERRIDE:PropInfo = {knowsAll: false, knowsAllEnumerable: false, knowsAllOverride: true};
export const NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE:PropInfo = {
    knowsAll: false,
    knowsAllEnumerable: true,
    knowsAllOverride: true
};
export const KNOWS_ALL:PropInfo = {knowsAll: true, knowsAllEnumerable: true, knowsAllOverride: true};

interface ObjectParameters {
    proto:ReferenceValue;
    properties:PropDescriptorMap;
    propertyInfo:PropInfo;
    trueValue:Object | null;
}

export class ReferenceValue extends SingleValue {
    constructor(readonly objectClass:ObjectClass) {
        super();
    }

    protected equalsInner(other:ReferenceValue):boolean {
        return this === other;
    }
}

function mergePropInfos(propInfo1:PropInfo, propInfo2:PropInfo):PropInfo {
    return {
        knowsAll: propInfo1.knowsAll && propInfo2.knowsAll,
        knowsAllOverride: propInfo1.knowsAllOverride && propInfo2.knowsAllOverride,
        knowsAllEnumerable: propInfo1.knowsAllEnumerable && propInfo2.knowsAllEnumerable
    };
}

const BOOLEAN_PROPERTY_INFOS:(keyof PropDescriptor)[] = ['enumerable', 'writable', 'hiddenSetter'];

function mergeProps(prop1:PropDescriptor, prop2:PropDescriptor):PropDescriptor {
    const result:PropDescriptor = {} as any;
    for (let i = 0; i < BOOLEAN_PROPERTY_INFOS.length; i++) {
        const property = BOOLEAN_PROPERTY_INFOS[i];
        if (prop1[property] !== prop2[property]) {
            return null;
        }
        result[property] = prop1[property];
    }

    if (prop1.value) {
        if (prop2.value) {
            result.value = prop1.value.or(prop2.value);
            return result;
        }
    } else if (prop1.get === prop2.get && prop1.set === prop2.set) {
        result.get = prop1.get;
        result.set = prop1.get;
        return result;
    }
    return null;
}

export class HeapObject {
    static DIRTY_OBJECT = new HeapObject({
        proto: null,
        properties: {},
        propertyInfo: MAY_HAVE_NEW,
        trueValue: null
    });

    readonly trueValue:Object | null;
    private proto:ReferenceValue;
    private properties:PropDescriptorMap;
    private propertyInfo:PropInfo;

    constructor(parameters:ObjectParameters) {
        this.proto = parameters.proto;
        this.properties = parameters.properties;
        this.propertyInfo = parameters.propertyInfo;
        this.trueValue = parameters.trueValue;
    }

    resolveProperty(state:EvaluationState, name:string, context:Object):Value {
        const property = this.resolvePropertyDescriptor(state, name);
        if (property === null) {
            return unknown;
        }
        if (property.get) {
            return state.createValueFromCall((property.get.objectClass as FunctionObjectClass).native, context, []);
        } else {
            return property.value;
        }
    }

    withProperty(name:string, newValue:Value, state:EvaluationState):HeapObject {
        const descriptor = this.resolvePropertyDescriptor(state, name);
        if (!descriptor) {
            return HeapObject.DIRTY_OBJECT;
        }

        if (!descriptor.value) {
            if (descriptor.set) {
                return HeapObject.DIRTY_OBJECT;
            } else {
                return this;
            }
        }
        if (!descriptor.writable) {
            return this;
        }
        if (descriptor.hiddenSetter) {
            return HeapObject.DIRTY_OBJECT;
        }
        const properties = this.cloneProperties();
        properties[name] = {
            enumerable: descriptor.enumerable,
            writable: true,
            configurable: descriptor.configurable,
            value: newValue
        };

        return new HeapObject({
            proto: this.proto,
            properties: properties,
            propertyInfo: this.propertyInfo,
            trueValue: null //todo
        });
    }

    withoutProperty(name:string):HeapObject {
        if (!this.hasProperty(name)) {
            return this;
        }
        const propertyDescriptor = this.properties[name];
        if (!propertyDescriptor.configurable) {
            return this;
        }

        const properties = this.cloneProperties();
        delete properties[name];
        let trueValue:any;
        if (this.trueValue) {
            trueValue = createMatchingObj(this.trueValue);

            const propNames = Object.getOwnPropertyNames(this.trueValue);
            for (let i = 0; i < propNames.length; i++) {
                const propName = propNames[i];
                if (propName !== name) {
                    trueValue[propName] = (this.trueValue as any)[propName];
                }
            }
        } else {
            trueValue = null;
        }

        return new HeapObject({
            proto: this.proto,
            properties: properties,
            propertyInfo: this.propertyInfo,
            trueValue: trueValue //todo
        });
    }

    canIterate(state:EvaluationState):boolean {
        if (!this.propertyInfo.knowsAllEnumerable) {
            return false;
        }
        if (this.proto) {
            return state.dereference(this.proto).canIterate(state);
        }
        return true;
    }

    iterate(state:EvaluationState, callback:(key:string) => void) {
        for (const i of Object.keys(this.properties)) {
            const property = this.properties[i];
            if (property.enumerable) {
                callback(i);
            }
        }
        if (this.proto) {
            state.dereference(this.proto).iterate(state, callback);
        }
    }

    hasProperty(name:string):boolean {
        return hasOwnProperty(this.properties, name);
    }

    or(other:HeapObject):HeapObject {
        const properties:PropDescriptorMap = {};
        let mayHaveNew = false;
        for (const propName of Object.keys(this.properties)) {
            const prop1 = this.properties[propName];
            if (hasOwnProperty(other.properties, propName)) {
                const prop2 = other.properties[propName];
                const merged = mergeProps(prop1, prop2);
                if (merged) {
                    properties[propName] = merged;
                } else {
                    mayHaveNew = true;
                }
            } else {
                mayHaveNew = true;
            }
        }

        for (const propName of Object.keys(other.properties)) {
            const prop1 = other.properties[propName];
            if (!hasOwnProperty(this.properties, propName)) {
                if (this.propertyInfo.knowsAll) {
                    properties[propName] = prop1;
                } else {
                    mayHaveNew = true;
                }
            }
        }

        return new HeapObject({
            proto: this.proto, //todo handle proto change
            properties: properties,
            propertyInfo: mayHaveNew ? MAY_HAVE_NEW : mergePropInfos(this.propertyInfo, other.propertyInfo),
            trueValue: null
        });
    }

    hasPropertyDeep(state:EvaluationState, name:string):boolean {
        if (this.hasProperty(name)) {
            return true;
        }
        if (this.proto) {
            return state.dereference(this.proto).hasPropertyDeep(state, name);
        }
        return false;
    }

    isCleanAccess(state:EvaluationState, name:string) {
        return this.resolvePropertyDescriptor(state, name) !== null;
    }

    isInstanceOf(constructor:HeapObject, state:EvaluationState):boolean {
        const prototype = constructor.resolvePropertyDescriptor(state, 'prototype');
        if (!prototype || !prototype.value) {
            return null;
        }
        let current:HeapObject = this;
        while (true) {
            if (current.proto === null) {
                if (!current.propertyInfo.knowsAllOverride) {
                    return null;
                }
                return false;
            }
            if (current.proto === prototype.value) {
                return true;
            }
            current = state.dereference(current.proto);
        }
    }

    eachReference(callback:(reference:ReferenceValue) => void) {
        if (this.proto) {
            callback(this.proto);
        }
        for (const i of Object.keys(this.properties)) {
            const property = this.properties[i];
            if (property.get) {
                callback(property.get);
            }
            if (property.set) {
                callback(property.set);
            }
            if (property.value instanceof ReferenceValue) {
                callback(property.value);
            }
        }
    }

    private cloneProperties() {
        const properties:PropDescriptorMap = {};

        for (const i of Object.keys(this.properties)) {
            properties[i] = this.properties[i];
        }
        return properties;
    }

    private resolvePropertyDescriptor(state:EvaluationState, name:string):PropDescriptor {
        let noNativeOverwrites = state.context.options.assumptions.noNativeOverwrites;
        if (!noNativeOverwrites && this.trueValue && state.scope.isBuiltIn(this.trueValue)) {
            return null;
        }

        if (this.hasProperty(name)) {
            return this.properties[name];
        }

        if (this.proto) {
            if (this.propertyInfo.knowsAll) {
                return state.dereference(this.proto).resolvePropertyDescriptor(state, name);
            } else if (this.propertyInfo.knowsAllOverride) {
                let protoObject = state.dereference(this.proto);
                if (protoObject.hasPropertyDeep(state, name)) {
                    return protoObject.resolvePropertyDescriptor(state, name);
                }
            }
        }
        return null;
    }
}

export class FiniteSetOfValues extends IterableValue {
    static create(values:SingleValue[]):Value {
        const withoutDuplicates = unique(values);

        if (withoutDuplicates.length === 1) {
            return withoutDuplicates[0];
        }

        return new FiniteSetOfValues(withoutDuplicates);
    }

    or(value:Value):Value {
        if (value instanceof SingleValue) {
            return FiniteSetOfValues.create([...this.values, value]);
        } else if (value instanceof FiniteSetOfValues) {
            return FiniteSetOfValues.create([...this.values, ...value.values]);
        } else {
            return value.or(this);
        }
    }

    map(mapper:(value:SingleValue) => Value):Value {
        let mapped:Value;
        for (let i = 0; i < this.values.length; i++) {
            let value = mapper(this.values[i]);
            if (mapped) {
                mapped = mapped.or(value);
            } else {
                mapped = value;
            }
        }
        return mapped;
    }

    each(callback:(value:SingleValue) => void):void {
        for (let i = 0; i < this.values.length; i++) {
            callback(this.values[i]);
        }
    }

    product(other:Value, mapper:(left:SingleValue, right:SingleValue) => Value):Value {
        if (other instanceof SingleValue) {
            return this.map(lval => mapper(lval, other));
        } else if (other instanceof FiniteSetOfValues) {
            return this.setProduct(other, mapper);
        } else {
            return other.product(this, mapper);
        }
    }

    size():number {
        return this.values.length;
    }

    protected equalsInner(other:FiniteSetOfValues):boolean {
        if (this.values.length !== other.values.length) {
            return false;
        }
        for (let i = 0; i < this.values.length; i++) {
            if (!this.values[i].equals(other.values[i])) {
                return false;
            }
        }
        return true;
    }

    private constructor(private values:SingleValue[]) {
        super();
    }

    private setProduct(other:FiniteSetOfValues, mapper:(left:SingleValue, right:SingleValue) => Value):Value {
        let mapped:Value;
        for (let i = 0; i < this.values.length; i++) {
            const left = this.values[i];
            for (let j = 0; j < other.values.length; j++) {
                const right = other.values[j];
                let value = mapper(left, right);
                if (mapped) {
                    mapped = mapped.or(value);
                } else {
                    mapped = value;
                }
            }
        }

        return mapped;
    }
}

function unique(values:SingleValue[]):SingleValue[] {
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
        const value = values[i];
        if (!contains(result, value)) {
            result.push(value);
        }
    }
    return result;
}

function contains(values:SingleValue[], value:SingleValue):boolean {
    for (let i = 0; i < values.length; i++) {
        if (values[i].equals(value)) {
            return true;
        }
    }
    return false;
}

export class UnknownValue extends Value {
    or():Value {
        return this;
    }

    map():Value {
        return this;
    }

    product():Value {
        return this;
    }

    protected equalsInner(other:this):boolean {
        return true;
    }
}

unknown = new UnknownValue();
