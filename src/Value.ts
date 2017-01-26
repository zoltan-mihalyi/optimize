export abstract class Value {
    abstract map(mapper:(value:SingleValue) => Value):Value;

    abstract or(value:Value):Value;

    abstract product(other:Value, mapper:(left:SingleValue, right:SingleValue) => Value):Value;
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

    equals(other:SingleValue):boolean {
        if (other.constructor === this.constructor) {
            return this.equalsInner(other as this);
        }
        return false;
    }

    protected abstract equalsInner(other:this):boolean;
}

function isNaN(value):boolean {
    return value !== value;
}

export class KnownValue extends SingleValue {
    constructor(public value:any) {
        super();
    }

    protected equalsInner(other:KnownValue):boolean {
        return this.value === other.value || (isNaN(this.value) && isNaN(other.value));
    }
}

export class ObjectValue extends SingleValue {
    constructor(private reference:Object) {
        super();
    }

    protected equalsInner(other:ObjectValue):boolean {
        return this.reference == other.reference;
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

    protected equalsInner() {
        return true;
    }
}

export const unknown:UnknownValue = new UnknownValue();