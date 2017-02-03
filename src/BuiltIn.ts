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
    REG_EXP
} from "./Value";
import {nonEnumerable, addConstants} from "./Utils";

function newFnProp():PropDescriptor {
    return nonEnumerable(new ObjectValue(FUNCTION, FunctionProto, {}, true));
}

const objectProtoProperties:any = {};
export const ObjectProto = new ObjectValue(OBJECT, null, objectProtoProperties, false);

const functionProtoProperties:any = {
    length: nonEnumerable(new KnownValue(1)),
    apply: newFnProp(),
    call: newFnProp(),
    toString: newFnProp()
};
export const FunctionProto = new ObjectValue(FUNCTION, ObjectProto, functionProtoProperties, false);
const FunctionConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(FunctionProto)
}, false);
functionProtoProperties.constructor = nonEnumerable(FunctionConstructor);


const ObjectConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(ObjectProto)
}, false);
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
export const ArrayProto = new ObjectValue(ARRAY, ObjectProto, arrayProtoProperties, false);
const ArrayConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(ArrayProto)
}, false);
arrayProtoProperties.constructor = nonEnumerable(ArrayConstructor);


const numberProtoProperties:any = {
    toExponential: newFnProp(),
    toFixed: newFnProp(),
    toLocaleString: newFnProp(),
    toPrecision: newFnProp(),
    toString: newFnProp(),
    valueOf: newFnProp()
};
export const NumberProto = new ObjectValue(NUMBER, ObjectProto, numberProtoProperties, false);
const NumberConstructor = new ObjectValue(FUNCTION, FunctionProto, addConstants({
    prototype: nonEnumerable(NumberProto)
}, Number, ['MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY']), false);
numberProtoProperties.constructor = nonEnumerable(NumberConstructor);


const booleanProtoProperties:any = {
    toString: newFnProp(),
    valueOf: newFnProp()
};
export const BooleanProto = new ObjectValue(BOOLEAN, ObjectProto, booleanProtoProperties, false);
const BooleanConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(BooleanProto)
}, false);
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
export const StringProto = new ObjectValue(STRING, ObjectProto, stringProtoProperties, false);
const StringConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(StringProto)
}, false);
stringProtoProperties.constructor = nonEnumerable(StringConstructor);


const regExpProtoProperties:any = {
    exec:newFnProp(),
    test:newFnProp(),
    toString:newFnProp(),
    compile:newFnProp()
};
export const RegExpProto = new ObjectValue(REG_EXP, ObjectProto, regExpProtoProperties, false);
const RegExpConstructor = new ObjectValue(FUNCTION, FunctionProto, {
    prototype: nonEnumerable(RegExpProto)
}, false);
regExpProtoProperties.constructor = nonEnumerable(RegExpConstructor);
