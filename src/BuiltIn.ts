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
    REG_EXP,
    PropInfo
} from "./Value";
import {nonEnumerable, addConstants} from "./Utils";

function newFnProp():PropDescriptor {
    return nonEnumerable(new ObjectValue(FUNCTION, FunctionProto, {}, PropInfo.NO_UNKNOWN_OVERRIDE));
}

const objectProtoProperties:any = {};
export const ObjectProto = new ObjectValue(OBJECT, null, objectProtoProperties, PropInfo.MAY_HAVE_NEW);

const functionProtoProperties:any = {
    length: nonEnumerable(new KnownValue(1)),
    apply: newFnProp(),
    call: newFnProp(),
    toString: newFnProp()
};
export const FunctionProto = new ObjectValue(FUNCTION, ObjectProto, functionProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const FunctionConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(FunctionProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
functionProtoProperties.constructor = nonEnumerable(FunctionConstructor);


const ObjectConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(ObjectProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
objectProtoProperties.constructor = nonEnumerable(ObjectConstructor);
objectProtoProperties.hasOwnProperty = newFnProp();
objectProtoProperties.isPrototypeOf = newFnProp();
objectProtoProperties.propertyIsEnumerable = newFnProp();
objectProtoProperties.toLocaleString = newFnProp();
objectProtoProperties.toString = newFnProp();
objectProtoProperties.valueOf = newFnProp();


const arrayProtoProperties:any = {
    length: nonEnumerable(new KnownValue(0)),
    toString: newFnProp(),
    toLocaleString: newFnProp(),
    join: newFnProp(),
    pop: newFnProp(),
    push: newFnProp(),
    reverse: newFnProp(),
    shift: newFnProp(),
    unshift: newFnProp(),
    slice: newFnProp(),
    splice: newFnProp(),
    sort: newFnProp(),
    concat: newFnProp()
};
export const ArrayProto = new ObjectValue(ARRAY, ObjectProto, arrayProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const ArrayConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(ArrayProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
arrayProtoProperties.constructor = nonEnumerable(ArrayConstructor);


const numberProtoProperties:any = {
    toExponential: newFnProp(),
    toFixed: newFnProp(),
    toLocaleString: newFnProp(),
    toPrecision: newFnProp(),
    toString: newFnProp(),
    valueOf: newFnProp()
};
export const NumberProto = new ObjectValue(NUMBER, ObjectProto, numberProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const NumberConstructor = new ObjectValue(FUNCTION, FunctionProto, addConstants({
    prototype: nonEnumerable(NumberProto)
}, Number, ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']), PropInfo.NO_UNKNOWN_OVERRIDE);
numberProtoProperties.constructor = nonEnumerable(NumberConstructor);


const booleanProtoProperties:any = {
    toString: newFnProp(),
    valueOf: newFnProp()
};
export const BooleanProto = new ObjectValue(BOOLEAN, ObjectProto, booleanProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const BooleanConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(BooleanProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
booleanProtoProperties.constructor = nonEnumerable(BooleanConstructor);


const stringProtoProperties:any = {
    length: nonEnumerable(new KnownValue(0)),
    charAt: newFnProp(),
    charCodeAt: newFnProp(),
    lastIndexOf: newFnProp(),
    localeCompare: newFnProp(),
    substr: newFnProp(),
    substring: newFnProp(),
    toString: newFnProp(),
    valueOf: newFnProp(),
    concat: newFnProp(),
    indexOf: newFnProp(),
    match: newFnProp(),
    replace: newFnProp(),
    search: newFnProp(),
    slice: newFnProp(),
    split: newFnProp(),
    toLowerCase: newFnProp(),
    toLocaleLowerCase: newFnProp(),
    toUpperCase: newFnProp(),
    toLocaleUpperCase: newFnProp(),
    link: newFnProp(),
    anchor: newFnProp(),
    fontcolor: newFnProp(),
    fontsize: newFnProp(),
    big: newFnProp(),
    blink: newFnProp(),
    bold: newFnProp(),
    fixed: newFnProp(),
    italics: newFnProp(),
    small: newFnProp(),
    strike: newFnProp(),
    sub: newFnProp(),
    sup: newFnProp()
};
export const StringProto = new ObjectValue(STRING, ObjectProto, stringProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const StringConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(StringProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
stringProtoProperties.constructor = nonEnumerable(StringConstructor);


const regExpProtoProperties:any = {
    exec:newFnProp(),
    test:newFnProp(),
    toString:newFnProp(),
    compile:newFnProp()
};
export const RegExpProto = new ObjectValue(REG_EXP, ObjectProto, regExpProtoProperties, PropInfo.NO_UNKNOWN_OVERRIDE);
const RegExpConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(RegExpProto)
}, PropInfo.NO_UNKNOWN_OVERRIDE);
regExpProtoProperties.constructor = nonEnumerable(RegExpConstructor);
