import {
    ObjectValue,
    OBJECT,
    ARRAY,
    FUNCTION,
    NUMBER,
    BOOLEAN,
    STRING,
    PropDescriptor,
    KnownValue,
    PropInfo,
    PropDescriptorMap,
    unknown,
    SingleValue,
    REG_EXP,
    ObjectClass,
    Value
} from "./Value";
import {nonEnumerable, isPrimitive, throwValue} from "./Utils";
import Map = require("./Map");
import Cache = require("./Cache");

export function canWrapObjectValue(value:SingleValue):boolean {
    return value instanceof ObjectValue || (value as KnownValue).value != null;
}

export function wrapObjectValue(value:SingleValue):ObjectValue {
    if (value instanceof KnownValue) {
        return getObjectValue(Object(value.value));
    } else {
        return value as ObjectValue;
    }
}

export function createCustomFunctionValue(length:number):ObjectValue {
    let properties:any = {};

    const fn = createFunctionValue(properties, length);
    properties.prototype = nonEnumerable(new ObjectValue(OBJECT, {
        proto: getObjectValue(Object.prototype),
        properties: {
            constructor: nonEnumerable(fn)
        },
        propertyInfo: PropInfo.KNOWS_ALL,
        trueValue: null //todo
    }));

    return fn;
}

function createFunctionValue(properties:PropDescriptorMap, length:number):ObjectValue {
    (properties as any).arguments = nonEnumerable(unknown);
    (properties as any).caller = nonEnumerable(unknown);
    (properties as any).length = nonEnumerable(new KnownValue(length));

    return new ObjectValue(FUNCTION, {
        proto: getObjectValue(Function.prototype),
        properties: properties,
        propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE,
        trueValue: null
    });
}

export function createValue(value:any):SingleValue {
    if (isPrimitive(value)) {
        return new KnownValue(value);
    } else {
        return getObjectValue(value);
    }
}

export function createValueFromCall(fn:Function, context:any, parameters:any[]):Value {
    let callResult;
    try {
        callResult = Function.prototype.apply.call(fn, context, parameters);
    } catch (e) {
        return throwValue(`CALLING ${fn} WITH CONTEXT: ${context} AND PARAMETERS: ${parameters} THROWS ${e}`);
    }
    return createValue(callResult);
}

const newCallCache = new Cache<number,Function>(paramNum => {
    let params:string[] = [];
    for (let i = 0; i < paramNum; i++) {
        params.push('p' + i);
    }
    let paramsString = params.join(',');
    return new Function(paramsString, 'return new this(' + paramsString + ')');
});

export function createValueFromNewCall(fn:Function, parameters:any[]):Value {
    return createValueFromCall(newCallCache.get(parameters.length), fn, parameters);
}

const map:Map<Object, ObjectValue> = new Map<Object, ObjectValue>();

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

const SAFE_PROPERTY_MAP:Map<Object,string[]> = new Map<Object, string[]>();
SAFE_PROPERTY_MAP.set(Object.prototype, [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
]);
SAFE_PROPERTY_MAP.set(Object, ['prototype']);
SAFE_PROPERTY_MAP.set(Function.prototype, ['constructor', 'length', 'apply', 'call', 'toString']);
SAFE_PROPERTY_MAP.set(Function, ['prototype']);
SAFE_PROPERTY_MAP.set(Array.prototype, [
    'constructor',
    'length',
    'toString',
    'toLocaleString',
    'join',
    'pop',
    'push',
    'reverse',
    'shift',
    'unshift',
    'slice',
    'splice',
    'sort',
    'concat'
]);
SAFE_PROPERTY_MAP.set(Array, ['prototype']);
SAFE_PROPERTY_MAP.set(Number.prototype, [
    'constructor',
    'toExponential',
    'toFixed',
    'toLocaleString',
    'toPrecision',
    'toString',
    'valueOf'
]);
SAFE_PROPERTY_MAP.set(Number, ['prototype', 'MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']);
SAFE_PROPERTY_MAP.set(Boolean.prototype, ['constructor', 'toString', 'valueOf']);
SAFE_PROPERTY_MAP.set(Boolean, ['prototype']);
SAFE_PROPERTY_MAP.set(String.prototype, [
    'constructor',
    'length',
    'charAt',
    'charCodeAt',
    'lastIndexOf',
    'localeCompare',
    'substr',
    'substring',
    'toString',
    'valueOf',
    'concat',
    'indexOf',
    'match',
    'replace',
    'search',
    'slice',
    'split',
    'toLowerCase',
    'toLocaleLowerCase',
    'toUpperCase',
    'toLocaleUpperCase'
]);
SAFE_PROPERTY_MAP.set(String, ['prototype']);
SAFE_PROPERTY_MAP.set(RegExp.prototype, [
    'constructor',
    'exec',
    'test',
    'toString',
    'compile',
    'global',
    'ignoreCase',
    'multiline',
    'source'
]);
SAFE_PROPERTY_MAP.set(RegExp, ['prototype']);
SAFE_PROPERTY_MAP.set(Math, [
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'max',
    'min',
    'pow',
    'random',
    'round',
    'sin',
    'sqrt',
    'tan',
    'E',
    'LN10',
    'LN2',
    'LOG10E',
    'LOG2E',
    'PI',
    'SQRT1_2',
    'SQRT2'
]);
SAFE_PROPERTY_MAP.set(Date, ['length', 'arguments', 'caller', 'prototype', 'parse', 'UTC']);
SAFE_PROPERTY_MAP.set(Date.prototype, [
    'constructor',
    'toString',
    'toDateString',
    'toTimeString',
    'toUTCString',
    'getDate',
    'setDate',
    'getDay',
    'getFullYear',
    'setFullYear',
    'getHours',
    'setHours',
    'getMilliseconds',
    'setMilliseconds',
    'getMinutes',
    'setMinutes',
    'getMonth',
    'setMonth',
    'getSeconds',
    'setSeconds',
    'getTime',
    'setTime',
    'getTimezoneOffset',
    'getUTCDate',
    'setUTCDate',
    'getUTCDay',
    'getUTCFullYear',
    'setUTCFullYear',
    'getUTCHours',
    'setUTCHours',
    'getUTCMilliseconds',
    'setUTCMilliseconds',
    'getUTCMinutes',
    'setUTCMinutes',
    'getUTCMonth',
    'setUTCMonth',
    'getUTCSeconds',
    'setUTCSeconds',
    'valueOf',
    'toLocaleString',
    'toLocaleDateString',
    'toLocaleTimeString'
]);

SAFE_PROPERTY_MAP.each(getObjectValue);

export function getObjectValue(object:Object):ObjectValue {
    if (map.has(object)) {
        return map.get(object);
    }

    let properties:PropDescriptorMap = {};
    let proto = Object.getPrototypeOf(object);

    const result = new ObjectValue(getObjectClass(object), {
        proto: proto ? getObjectValue(proto) : null,
        properties: properties,
        propertyInfo: SAFE_PROPERTY_MAP.has(object) ? PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE : PropInfo.KNOWS_ALL,
        trueValue: object
    });
    map.set(object, result);

    const propNames:string[] = SAFE_PROPERTY_MAP.has(object) ? SAFE_PROPERTY_MAP.get(object) : Object.getOwnPropertyNames(object);
    for (let i = 0; i < propNames.length; i++) {
        const propName = propNames[i];
        const propertyDescriptor = Object.getOwnPropertyDescriptor(object, propName);
        const propDescriptor:PropDescriptor = {
            enumerable: propertyDescriptor.enumerable
        };
        if (propertyDescriptor.hasOwnProperty('value')) {
            propDescriptor.value = createValue((object as any)[propName]);
        }
        if (propertyDescriptor.hasOwnProperty('get')) {
            propDescriptor.get = createValue(propertyDescriptor.get) as ObjectValue;
        }
        properties[propName] = propDescriptor;
    }
    return result;
}