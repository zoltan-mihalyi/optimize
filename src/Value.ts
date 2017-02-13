import {equals} from "./Utils";
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

export const enum ComparisonResult{
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

    abstract compareTo(other:SingleValue, strict:boolean):ComparisonResult;
}

export class KnownValue extends SingleValue {
    constructor(public value:string|boolean|number) {
        super();
    }

    compareTo(other:SingleValue, strict:boolean):ComparisonResult {
        if (other instanceof KnownValue) {
            let equals = strict ? (this.value === other.value) : (this.value == other.value);
            return fromBoolean(equals);
        } else {
            return (other as ObjectValue).compareTo(this, strict);
        }
    }

    protected equalsInner(other:KnownValue):boolean {
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

export interface PropDescriptor {
    enumerable:boolean;
    value?:Value;
    get?:ObjectValue;
}

export interface PropDescriptorMap {
    [idx:string]:PropDescriptor;
}

export const enum PropInfo {
    MAY_HAVE_NEW, NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE, KNOWS_ALL
}

interface ObjectParameters {
    proto:ObjectValue;
    properties:PropDescriptorMap;
    propertyInfo:PropInfo;
    trueValue:Object|null;
}

export class ObjectValue extends SingleValue {
    private proto:ObjectValue;
    private properties:PropDescriptorMap;
    private propertyInfo:PropInfo;
    readonly trueValue:Object|null;

    constructor(readonly objectClass:ObjectClass, parameters:ObjectParameters) {
        super();
        this.proto = parameters.proto;
        this.properties = parameters.properties;
        this.propertyInfo = parameters.propertyInfo;
        this.trueValue = parameters.trueValue;
    }

    compareTo(other:SingleValue, strict:boolean):ComparisonResult {
        if (other instanceof ObjectValue) {
            return fromBoolean(this === other);
        }
        if (strict) {
            return ComparisonResult.FALSE;
        }
        if (this.trueValue) {
            return fromBoolean(this.trueValue == (other as KnownValue).value);
        }
        return ComparisonResult.UNKNOWN;
    }

    resolveProperty(name:string, getterEvaluator:(fn:Function) => Value):Value {
        if (this.hasProperty(name)) {
            let property = this.properties[name];
            if (property.get) {
                return getterEvaluator(property.get.trueValue as Function);
            } else {
                return property.value;
            }
        }

        switch (this.propertyInfo) {
            case PropInfo.MAY_HAVE_NEW:
                return unknown;
            case PropInfo.KNOWS_ALL:
                if (this.proto) {
                    return this.proto.resolveProperty(name, getterEvaluator);
                } else {
                    return new KnownValue(void 0);
                }
            case PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE:
                if (this.proto.hasPropertyDeep(name)) {
                    return this.proto.resolveProperty(name, getterEvaluator);
                }
                return unknown;
        }
    }

    canIterate():boolean {
        if (this.propertyInfo === PropInfo.MAY_HAVE_NEW) {
            return false;
        }
        if (this.proto) {
            return this.proto.canIterate();
        }
        return true;
    }

    iterate(callback:(key:string) => void) {
        for (const i in this.properties) {
            if (Object.prototype.hasOwnProperty.call(this.properties, i)) {
                const property = this.properties[i];
                if (property.enumerable) {
                    callback(i);
                }
            }
        }
        if (this.proto) {
            this.proto.iterate(callback);
        }
    }

    hasProperty(name:string):boolean {
        return Object.prototype.hasOwnProperty.call(this.properties, name);
    }

    protected equalsInner(other:ObjectValue):boolean {
        return this.objectClass === other.objectClass;
    }

    private hasPropertyDeep(name:string):boolean {
        if (this.hasProperty(name)) {
            return true;
        }
        if (this.proto) {
            return this.proto.hasPropertyDeep(name);
        }
        return false;
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

export const unknown:UnknownValue = new UnknownValue();
