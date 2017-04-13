import {equals, hasOwnProperty} from "./Utils";
import Map = require("./Map");
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

export const enum ComparisonResult {
    TRUE,
    FALSE,
    UNKNOWN
}

function fromBoolean(bool:boolean):ComparisonResult {
    return bool ? ComparisonResult.TRUE : ComparisonResult.FALSE;
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
    constructor(public value:string|boolean|number) {
        super();
    }

    protected equalsInner(other:PrimitiveValue):boolean {
        return equals(this.value, other.value);
    }
}

export abstract class ObjectClass {
    abstract getTypeof():string;
}
class FunctionObjectClass extends ObjectClass {
    getTypeof():string {
        return 'function';
    }
}
export const FUNCTION = new FunctionObjectClass();

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
    value?:Value;
    get?:ReferenceValue;
}

export interface PropDescriptorMap {
    [idx:string]:PropDescriptor;
}

export const enum PropInfo {
    MAY_HAVE_NEW, NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE, KNOWS_ALL
}

interface ObjectParameters {
    proto:ReferenceValue;
    properties:PropDescriptorMap;
    propertyInfo:PropInfo;
    trueValue:Object|null;
}

export class ReferenceValue extends SingleValue {
    protected equalsInner(other:ReferenceValue):boolean {
        return this === other;
    }

}

function mergePropInfos(propInfo1:PropInfo, propInfo2:PropInfo):PropInfo {
    if (propInfo1 === PropInfo.MAY_HAVE_NEW || propInfo2 === PropInfo.MAY_HAVE_NEW) {
        return PropInfo.MAY_HAVE_NEW;
    } else if (propInfo1 === PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE || propInfo2 == PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE) {
        return PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE;
    }
    return PropInfo.KNOWS_ALL;
}

function mergeProps(prop1:PropDescriptor, prop2:PropDescriptor):PropDescriptor {
    if (prop1.enumerable === prop2.enumerable) {
        if (prop1.value && prop2.value) {
            return {
                value: prop1.value.or(prop2.value),
                enumerable: prop1.enumerable
            };
        } else if (prop1.get && prop1.get === prop2.get) {
            return {
                enumerable: prop1.enumerable,
                get: prop1.get
            }
        }
    }
    return null;
}

export class HeapObject {
    readonly trueValue:Object|null;
    private proto:ReferenceValue;
    private properties:PropDescriptorMap;
    private propertyInfo:PropInfo;

    constructor(readonly objectClass:ObjectClass, parameters:ObjectParameters) {
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
            return state.createValueFromCall(state.dereference(property.get).trueValue as Function, context, []);
        } else {
            return property.value;
        }
    }

    withProperty(name:string, newValue:Value):HeapObject {

        const properties:PropDescriptorMap = {};

        for (const i in this.properties) {
            properties[i] = this.properties[i];
        }
        properties[name] = {
            enumerable: true,
            value: newValue
        };

        return new HeapObject(this.objectClass, {
            proto: this.proto,
            properties: properties,
            propertyInfo: this.propertyInfo,
            trueValue: null //todo
        });
    }

    canIterate(state:EvaluationState):boolean {
        if (this.propertyInfo === PropInfo.MAY_HAVE_NEW) {
            return false;
        }
        if (this.proto) {
            return state.dereference(this.proto).canIterate(state);
        }
        return true;
    }

    iterate(state:EvaluationState, callback:(key:string) => void) {
        for (const i in this.properties) {
            /* istanbul ignore else */
            if (hasOwnProperty(this.properties, i)) {
                const property = this.properties[i];
                if (property.enumerable) {
                    callback(i);
                }
            }
        }
        if (this.proto) {
            state.dereference(this.proto).iterate(state, callback);
        }
    }

    hasProperty(name:string):boolean {
        return hasOwnProperty(this.properties, name);
    }

    dirty() { //todo used?
        return new HeapObject(this.objectClass, {
            proto: null,
            properties: {},
            propertyInfo: PropInfo.MAY_HAVE_NEW,
            trueValue: null
        });
    }

    or(other:HeapObject):HeapObject {
        const properties:PropDescriptorMap = {};
        let mayHaveNew = false;
        for (const propName in this.properties) {
            if (hasOwnProperty(this.properties, propName)) {
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
        }

        for (const propName in other.properties) {
            if (hasOwnProperty(other.properties, propName)) {
                const prop1 = other.properties[propName];
                if (!hasOwnProperty(this.properties, propName)) {
                    if (this.propertyInfo === PropInfo.KNOWS_ALL) {
                        properties[propName] = prop1;
                    } else {
                        mayHaveNew = true;
                    }
                }
            }
        }

        return new HeapObject(this.objectClass, {
            proto: this.proto, //todo handle proto change
            properties: properties,
            propertyInfo: mayHaveNew ? PropInfo.MAY_HAVE_NEW : mergePropInfos(this.propertyInfo, other.propertyInfo),
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

    private resolvePropertyDescriptor(state:EvaluationState, name:string):PropDescriptor {
        let noNativeOverwrites = state.context.options.assumptions.noNativeOverwrites;
        if (!noNativeOverwrites && this.trueValue && state.isBuiltIn(this.trueValue)) {
            return null;
        }

        if (this.hasProperty(name)) {
            return this.properties[name];
        }

        switch (this.propertyInfo) {
            case PropInfo.MAY_HAVE_NEW:
                return null;
            case PropInfo.KNOWS_ALL:
                if (this.proto) {
                    return state.dereference(this.proto).resolvePropertyDescriptor(state, name);
                }
                return null;
            case PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE:
                if (this.proto) {
                    let protoObject = state.dereference(this.proto);
                    if (protoObject.hasPropertyDeep(state, name)) {
                        return protoObject.resolvePropertyDescriptor(state, name);
                    }
                }
                return null;
        }
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
