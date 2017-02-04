import {PropDescriptorMap, KnownValue, Value, PropDescriptor, unknown} from "./Value";
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

export function addConstants(props:PropDescriptorMap, source:any, propertiesToAdd:string[]):PropDescriptorMap {
    for (let i = 0; i < propertiesToAdd.length; i++) {
        const prop = propertiesToAdd[i];
        props[prop] = nonEnumerable(new KnownValue(source[prop]));
    }
    return props;
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