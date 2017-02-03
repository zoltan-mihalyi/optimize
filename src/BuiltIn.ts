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
    unknown
} from "./Value";
import {nonEnumerable, addConstants} from "./Utils";

function nativeFnProp(native:Function):PropDescriptor {
    return nonEnumerable(createNativeFunctionValue({}, native));
}

function createNativeFunctionValue(properties:PropDescriptorMap, native:Function):ObjectValue {
    return createFunctionValue(properties, native.length, native);
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

const objectProtoProperties:any = {};
export const ObjectProto = new ObjectValue(OBJECT, {
    proto: null,
    properties: objectProtoProperties,
    propertyInfo: PropInfo.MAY_HAVE_NEW,
    trueValue: Object.prototype
});

const functionProtoProperties:any = {
    length: nonEnumerable(new KnownValue(1)),
    apply: nativeFnProp(Function.prototype.apply),
    call: nativeFnProp(Function.prototype.call),
    toString: nativeFnProp(Function.prototype.toString)
};
export const FunctionProto = new ObjectValue(FUNCTION, {
    proto: ObjectProto,
    properties: functionProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: Function.prototype
});
const FunctionConstructor = new ObjectValue(FUNCTION, {
    proto: FunctionProto,
    properties: {
        prototype: nonEnumerable(FunctionProto)
    },
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: Function
});
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
export const ArrayProto = new ObjectValue(ARRAY, {
    proto: ObjectProto,
    properties: arrayProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: Array.prototype
});
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
export const NumberProto = new ObjectValue(NUMBER, {
    proto: ObjectProto,
    properties: numberProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: Number.prototype
});

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
export const BooleanProto = new ObjectValue(BOOLEAN, {
    proto: ObjectProto,
    properties: booleanProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: Boolean.prototype
});
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
export const StringProto = new ObjectValue(STRING, {
    proto: ObjectProto,
    properties: stringProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: String.prototype
});
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
export const RegExpProto = new ObjectValue(OBJECT, {
    proto: ObjectProto,
    properties: regExpProtoProperties,
    propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE,
    trueValue: RegExp.prototype
});
const RegExpConstructor = createNativeFunctionValue({
    prototype: nonEnumerable(RegExpProto)
}, RegExp);
regExpProtoProperties.constructor = nonEnumerable(RegExpConstructor);
