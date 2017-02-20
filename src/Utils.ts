import recast = require("recast");

const builders = recast.types.builders;
import {KnownValue, Value, PropDescriptor, unknown, ObjectValue, SingleValue} from "./Value";
import {SemanticNode} from "./node/SemanticNode";
import Cache = require("./Cache");
import Scope = require("./Scope");

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

export function nonEnumerable(value:Value):PropDescriptor {
    return {
        enumerable: false,
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

export function canWrapObjectValue(value:SingleValue):boolean {
    return value instanceof ObjectValue || (value as KnownValue).value != null;
}

export function isInnerScoped(node:SemanticNode):node is InnerScoped {
    return node !== null && hasOwnProperty(node, 'innerScope');
}

const hasOwnProp = Object.prototype.hasOwnProperty;
export function hasOwnProperty(object:Object, property:string):boolean {
    return hasOwnProp.call(object, property);
}