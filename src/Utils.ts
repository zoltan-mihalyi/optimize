import recast = require("recast");

const builders = recast.types.builders;import {PropDescriptorMap, KnownValue, Value, PropDescriptor, unknown, ObjectValue} from "./Value";
export function createUnusedName(base:string, isUsed:(name:string) => boolean) {
    let name = base;
    let i = 2;
    while (isUsed(name)) {
        name = base + i;
        i++;
    }
    return name;
}

export function nonEnumerable(value:Value):PropDescriptor {
    return {
        enumerable: false,
        value: value
    }
}

export function isPrimitive(value:any):value is number|string|boolean|null {
    if (value === null) {
        return true;
    }
    return typeof value !== 'object' && typeof value !== 'function';
}

export function throwValue(msg:string):Value {
    console.log('WARNING: ' + msg);
    return unknown;
}

export function equals(a:any, b:any):boolean {
    return a === b || (a !== a && b !== b);
}

export function hasTrueValue(value:Value):boolean {
    return value instanceof KnownValue || (value instanceof ObjectValue && !!value.trueValue);
}

export function getTrueValue(value:Value):any {
    if (value instanceof KnownValue) {
        return value.value;
    } else if (value instanceof ObjectValue && value.trueValue) {
        return value.trueValue;
    }
    throw new Error('no true value');
}

export function map<S,T>(data:S[], transform:(source:S) => T):T[] {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        result.push(transform(data[i]));
    }
    return result;
}

export function void0():Expression {
    return builders.unaryExpression('void', builders.literal(0));
}