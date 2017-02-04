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
    ObjectClass
} from "./Value";
import {nonEnumerable, addConstants, isPrimitive} from "./Utils";
import Map = require("./Map");

function nativeFnProp(native:Function):PropDescriptor {
    return nonEnumerable(createNativeFunctionValue({}, native));
}

function createNativeFunctionValue(properties:PropDescriptorMap, native:Function):ObjectValue {
    const value = createFunctionValue(properties, native.length, native);
    map.set(native, value);
    return value;
}

export function createFunctionValue(properties:PropDescriptorMap, length:number, native?:Function):ObjectValue {
    (properties as any).arguments = nonEnumerable(unknown);
    (properties as any).caller = nonEnumerable(unknown);
    (properties as any).length = nonEnumerable(new KnownValue(length));

    return new ObjectValue(FUNCTION, {
        proto: FunctionProto,
        properties: properties,
        propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
        trueValue: native
    });
}

export function createValue(value:any):SingleValue {
    if (isPrimitive(value)) {
        return new KnownValue(value);
    } else {
        return objectValueFromObject(value);
    }
}

const map:Map<Object, ObjectValue> = new Map<Object, ObjectValue>();

export function objectValueFromObject(object:Object):ObjectValue {
    if (map.has(object)) {
        return map.get(object);
    }

    let properties:PropDescriptorMap = {};
    let proto = Object.getPrototypeOf(object);
    if (proto) {
        objectValueFromObject(proto);
    }
    const result = objectValueFromProperties(object, properties, PropInfo.KNOWS_ALL);

    const propNames = Object.getOwnPropertyNames(object);
    for (let i = 0; i < propNames.length; i++) {
        const propName = propNames[i];
        const propDescriptor = Object.getOwnPropertyDescriptor(object, propName);
        properties[propName] = {
            enumerable: propDescriptor.enumerable,
            value: createValue((object as any)[propName])
        };
    }
    return result;
}

function objectValueFromProperties(object:Object, properties:PropDescriptorMap, info:PropInfo):ObjectValue {
    let protoObject = Object.getPrototypeOf(object);
    let protoValue = protoObject ? map.get(protoObject) : null;
    const result = new ObjectValue(getObjectClass(object), {
        proto: protoValue,
        properties: properties,
        propertyInfo: info,
        trueValue: object
    });
    map.set(object, result);
    return result;
}

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

const objectProtoProperties:any = {};
export const ObjectProto = objectValueFromProperties(Object.prototype, objectProtoProperties, PropInfo.MAY_HAVE_NEW);

const functionProtoProperties:any = {
    length: nonEnumerable(new KnownValue(1)),
    apply: nativeFnProp(Function.prototype.apply),
    call: nativeFnProp(Function.prototype.call),
    toString: nativeFnProp(Function.prototype.toString)
};
export const FunctionProto = objectValueFromProperties(Function.prototype, functionProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const FunctionConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(FunctionProto)
}, Function);
functionProtoProperties.constructor = nonEnumerable(FunctionConstructor);


const ObjectConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(ObjectProto)
}, Object);

objectProtoProperties.constructor = nonEnumerable(ObjectConstructor);
objectProtoProperties.hasOwnProperty = nativeFnProp(Object.prototype.hasOwnProperty);
objectProtoProperties.isPrototypeOf = nativeFnProp(Object.prototype.isPrototypeOf);
objectProtoProperties.propertyIsEnumerable = nativeFnProp(Object.prototype.propertyIsEnumerable);
objectProtoProperties.toLocaleString = nativeFnProp(Object.prototype.toLocaleString);
objectProtoProperties.toString = nativeFnProp(Object.prototype.toString);
objectProtoProperties.valueOf = nativeFnProp(Object.prototype.valueOf);


const arrayProtoProperties:any = {
    length: nonEnumerable(new KnownValue(0)),
    toString: nativeFnProp(Array.prototype.toString),
    toLocaleString: nativeFnProp(Array.prototype.toLocaleString),
    join: nativeFnProp(Array.prototype.join),
    pop: nativeFnProp(Array.prototype.pop),
    push: nativeFnProp(Array.prototype.push),
    reverse: nativeFnProp(Array.prototype.reverse),
    shift: nativeFnProp(Array.prototype.shift),
    unshift: nativeFnProp(Array.prototype.unshift),
    slice: nativeFnProp(Array.prototype.slice),
    splice: nativeFnProp(Array.prototype.splice),
    sort: nativeFnProp(Array.prototype.sort),
    concat: nativeFnProp(Array.prototype.concat)
};
export const ArrayProto = objectValueFromProperties(Array.prototype, arrayProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const ArrayConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(ArrayProto)
}, Array);
arrayProtoProperties.constructor = nonEnumerable(ArrayConstructor);


const numberProtoProperties:any = {
    toExponential: nativeFnProp(Number.prototype.toExponential),
    toFixed: nativeFnProp(Number.prototype.toFixed),
    toLocaleString: nativeFnProp(Number.prototype.toLocaleString),
    toPrecision: nativeFnProp(Number.prototype.toPrecision),
    toString: nativeFnProp(Number.prototype.toString),
    valueOf: nativeFnProp(Number.prototype.valueOf)
};
export const NumberProto = objectValueFromProperties(Number.prototype, numberProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);

const numberConstructorProperties = addConstants({
        prototype: nonEnumerable(NumberProto)
    }, Number, ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']
);
const NumberConstructor = createNativeFunctionValue(numberConstructorProperties, Number);
numberProtoProperties.constructor = nonEnumerable(NumberConstructor);


const booleanProtoProperties:any = {
    toString: nativeFnProp(Boolean.prototype.toString),
    valueOf: nativeFnProp(Boolean.prototype.valueOf)
};
export const BooleanProto = objectValueFromProperties(Boolean.prototype, booleanProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const BooleanConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(BooleanProto)
}, Boolean);
booleanProtoProperties.constructor = nonEnumerable(BooleanConstructor);


const stringProtoProperties:any = {
    length: nonEnumerable(new KnownValue(0)),
    charAt: nativeFnProp(String.prototype.charAt),
    charCodeAt: nativeFnProp(String.prototype.charCodeAt),
    lastIndexOf: nativeFnProp(String.prototype.lastIndexOf),
    localeCompare: nativeFnProp(String.prototype.localeCompare),
    substr: nativeFnProp(String.prototype.substr),
    substring: nativeFnProp(String.prototype.substring),
    toString: nativeFnProp(String.prototype.toString),
    valueOf: nativeFnProp(String.prototype.valueOf),
    concat: nativeFnProp(String.prototype.concat),
    indexOf: nativeFnProp(String.prototype.indexOf),
    match: nativeFnProp(String.prototype.match),
    replace: nativeFnProp(String.prototype.replace),
    search: nativeFnProp(String.prototype.search),
    slice: nativeFnProp(String.prototype.slice),
    split: nativeFnProp(String.prototype.split),
    toLowerCase: nativeFnProp(String.prototype.toLowerCase),
    toLocaleLowerCase: nativeFnProp(String.prototype.toLocaleLowerCase),
    toUpperCase: nativeFnProp(String.prototype.toUpperCase),
    toLocaleUpperCase: nativeFnProp(String.prototype.toLocaleUpperCase)
};
export const StringProto = objectValueFromProperties(String.prototype, stringProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const StringConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(StringProto)
}, String);
stringProtoProperties.constructor = nonEnumerable(StringConstructor);


const regExpProtoProperties:any = {
    exec: nativeFnProp(RegExp.prototype.exec),
    test: nativeFnProp(RegExp.prototype.test),
    toString: nativeFnProp(RegExp.prototype.toString),
    compile: nativeFnProp(RegExp.prototype.compile)
};
export const RegExpProto = objectValueFromProperties(RegExp.prototype, regExpProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const RegExpConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(RegExpProto)
}, RegExp);
regExpProtoProperties.constructor = nonEnumerable(RegExpConstructor);
