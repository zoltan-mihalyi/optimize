import {
    ARRAY,
    BOOLEAN,
    FunctionObjectClass,
    HeapObject,
    KNOWS_ALL,
    NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE,
    NUMBER,
    OBJECT,
    ObjectClass,
    PrimitiveValue,
    PropDescriptor,
    PropDescriptorMap,
    ReferenceValue,
    REG_EXP,
    SingleValue,
    STRING
} from "./Value";
import {getClassName, hasOwnProperty, isPrimitive} from "../utils/Utils";
import Map = require("../utils/Map");
import SafeProperties = require("./SafeProperties");

function getObjectClass(value:Object):ObjectClass {
    const className = getClassName(value);

    switch (className) {
        case 'Function':
            return new FunctionObjectClass(null, value as Function);
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

abstract class Resolver {
    private objectToReferenceMap:Map<Object, ReferenceValue> = new Map<Object, ReferenceValue>();

    constructor(private resolverParent:Resolver) {
    }

    getReferenceValue(object:Object):ReferenceValue {
        let referenceValue = this.getObjectReference(object);
        if (referenceValue !== null) {
            return referenceValue;
        }
        return this.createHeapObject(object, (objectClass, heapObject) => this.createObject(objectClass, heapObject));
    }

    createHeapObject<T>(object:Object, register:(objectClass:ObjectClass, heapObject:HeapObject) => T) {
        let properties:PropDescriptorMap = {};
        let proto = Object.getPrototypeOf(object);

        const objectClass = getObjectClass(object);
        const heapObject = new HeapObject({
            proto: proto ? this.getReferenceValue(proto) : null,
            properties: properties,
            propertyInfo: SafeProperties.has(object) ? NO_UNKNOWN_OVERRIDE_OR_ENUMERABLE : KNOWS_ALL,
            trueValue: object
        });
        const reference = register(objectClass, heapObject);

        const propNames:string[] = SafeProperties.has(object) ? SafeProperties.get(object) : Object.getOwnPropertyNames(object);
        for (let i = 0; i < propNames.length; i++) {
            const propName = propNames[i];
            const propertyDescriptor = Object.getOwnPropertyDescriptor(object, propName);
            const propDescriptor:PropDescriptor = {
                enumerable: propertyDescriptor.enumerable,
                writable: propertyDescriptor.writable,
                configurable: propertyDescriptor.configurable,
                hiddenSetter: objectClass === ARRAY && propName === 'length'
            };
            if (hasOwnProperty(propertyDescriptor, 'value')) {
                propDescriptor.value = this.createValue((object as any)[propName]);
            } else {
                if (propertyDescriptor.get) {
                    propDescriptor.get = this.createValue(propertyDescriptor.get) as ReferenceValue;
                }
                if (propertyDescriptor.set) {
                    propDescriptor.set = this.createValue(propertyDescriptor.set) as ReferenceValue;
                }
            }
            properties[propName] = propDescriptor;
        }
        return reference;
    }

    createValue(value:any):SingleValue {
        if (isPrimitive(value)) {
            return new PrimitiveValue(value);
        } else {
            return this.getReferenceValue(value);
        }
    }

    hasObject(key:Object):boolean {
        return this.objectToReferenceMap.has(key);
    }

    createObject(objectClass:ObjectClass, heapObject:HeapObject):ReferenceValue {
        const reference = new ReferenceValue(objectClass);
        this.onObjectCreate(heapObject, reference);
        if (heapObject.trueValue) {
            this.objectToReferenceMap.set(heapObject.trueValue, reference);
        }
        return reference;
    }

    protected updateObjectToReference(cloned:Object, reference:ReferenceValue) {
        this.objectToReferenceMap.set(cloned, reference);
    }

    protected abstract onObjectCreate(heapObject:HeapObject, reference:ReferenceValue):void;

    protected getObjectReference(object:Object):ReferenceValue {
        if (this.objectToReferenceMap.has(object)) {
            return this.objectToReferenceMap.get(object);
        }
        if (this.resolverParent) {
            return this.resolverParent.getObjectReference(object);
        }
        return null;
    }
}

export = Resolver;