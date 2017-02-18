import {
    ObjectValue,
    SingleValue,
    Value,
    KnownValue,
    FUNCTION,
    OBJECT,
    PropInfo,
    PropDescriptorMap,
    unknown,
    ObjectClass,
    ARRAY,
    REG_EXP,
    STRING,
    BOOLEAN,
    NUMBER,
    PropDescriptor
} from "./Value";
import {throwValue, isPrimitive, nonEnumerable} from "./Utils";
import Map = require("./Map");
import Cache = require("./Cache");
import SafeProperties = require("./SafeProperties");

const defaultValues:Map<Object, ObjectValue> = new Map<Object, ObjectValue>();

const newCallCache = new Cache<number,Function>(paramNum => {
    let params:string[] = [];
    for (let i = 0; i < paramNum; i++) {
        params.push('p' + i);
    }
    let paramsString = params.join(',');
    return new Function(paramsString, 'return new this(' + paramsString + ')');
});

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

export default class Context {
    isBuiltIn(key:Object):boolean {
        return defaultValues.has(key);
    }

    constructor(private temporalValues:Map<Object,ObjectValue> = new Map<Object,ObjectValue>()) {
    }

    wrapObjectValue(value:SingleValue):ObjectValue {
        if (value instanceof KnownValue) {
            return this.getObjectValue(Object(value.value));
        } else {
            return value as ObjectValue;
        }
    }

    createCustomFunctionValue(length:number):ObjectValue {
        let properties:any = {};

        const fn = this.createFunctionValue(properties, length);
        properties.prototype = nonEnumerable(new ObjectValue(OBJECT, {
            proto: this.getObjectValue(Object.prototype),
            properties: {
                constructor: nonEnumerable(fn)
            },
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: null //todo
        }));

        return fn;
    }

    createFunctionValue(properties:PropDescriptorMap, length:number):ObjectValue {
        (properties as any).arguments = nonEnumerable(unknown);
        (properties as any).caller = nonEnumerable(unknown);
        (properties as any).length = nonEnumerable(new KnownValue(length));

        return new ObjectValue(FUNCTION, {
            proto: this.getObjectValue(Function.prototype),
            properties: properties,
            propertyInfo: PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE,
            trueValue: null
        });
    }

    createValue(value:any):SingleValue {
        if (isPrimitive(value)) {
            return new KnownValue(value);
        } else {
            return this.getObjectValue(value);
        }
    }

    createValueFromCall(fn:Function, context:any, parameters:any[]):Value {
        let callResult;
        try {
            callResult = Function.prototype.apply.call(fn, context, parameters);
        } catch (e) {
            return throwValue(`CALLING ${fn} WITH CONTEXT: ${context} AND PARAMETERS: ${parameters} THROWS ${e}`);
        }
        return this.createValue(callResult);
    }

    createValueFromNewCall(fn:Function, parameters:any[]):Value {
        return this.createValueFromCall(newCallCache.get(parameters.length), fn, parameters);
    }


    getObjectValue(object:Object):ObjectValue {
        if (defaultValues.has(object)) {
            return defaultValues.get(object);
        }
        if (this.temporalValues && this.temporalValues.has(object)) {
            return this.temporalValues.get(object);
        }

        let properties:PropDescriptorMap = {};
        let proto = Object.getPrototypeOf(object);

        const result = new ObjectValue(getObjectClass(object), {
            proto: proto ? this.getObjectValue(proto) : null,
            properties: properties,
            propertyInfo: SafeProperties.has(object) ? PropInfo.NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE : PropInfo.KNOWS_ALL,
            trueValue: object
        });
        (this.temporalValues || defaultValues).set(object, result);

        const propNames:string[] = SafeProperties.has(object) ? SafeProperties.get(object) : Object.getOwnPropertyNames(object);
        for (let i = 0; i < propNames.length; i++) {
            const propName = propNames[i];
            const propertyDescriptor = Object.getOwnPropertyDescriptor(object, propName);
            const propDescriptor:PropDescriptor = {
                enumerable: propertyDescriptor.enumerable
            };
            if (propertyDescriptor.hasOwnProperty('value')) {
                propDescriptor.value = this.createValue((object as any)[propName]);
            } else if (propertyDescriptor.hasOwnProperty('get')) {
                propDescriptor.get = this.createValue(propertyDescriptor.get) as ObjectValue;
            }
            properties[propName] = propDescriptor;
        }
        return result;
    }
}

const emptyContext = new Context(null);

SafeProperties.each(obj => emptyContext.getObjectValue(obj));