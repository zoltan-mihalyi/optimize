import {createUnusedName, hasOwnProperty} from "../utils/Utils";
import {Heap, Variable} from "../utils/Variable";
import {HeapObject, ObjectClass, ReferenceValue, unknown, Value} from "./Value";
import Map = require("../utils/Map");
import SafeProperties = require("./SafeProperties");
import Resolver = require("./Resolver");

interface Variables {
    [name:string]:Variable;
}

class Scope extends Resolver {
    static readonly ROOT_SCOPE = new Scope(null, false);

    possibleHeap:Heap;
    readonly initialValues:Map<Variable, Value> = new Map<Variable, Value>();
    readonly initialHeap:Heap = new Map<ReferenceValue, HeapObject>();

    private readonly variables:Variables = {};

    constructor(readonly parent:Scope, readonly blockScope:boolean) {
        super(parent);
    }

    has(name:string):boolean {
        return !!this.get(name);
    }

    getOrCreate(name:string):Variable {
        const result = this.get(name);
        if (result) {
            return result;
        }
        return this.setUnknownGlobal(name);
    }

    get(name:string):Variable {
        /* istanbul ignore else */
        if (hasOwnProperty(this.variables, name)) {
            return this.variables[name];
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        return null;
    }

    each(callback:(name:string, variable:Variable) => void) {
        for (const name in this.variables) {
            if (hasOwnProperty(this.variables, name)) {
                callback(name, this.variables[name]);
            }
        }
    }

    set(name:string, blockScope:boolean, initialValue:Value):Variable {
        if (!blockScope && this.blockScope) {
            return this.parent.set(name, false, initialValue);
        }
        const variable:Variable = this.variables[name] = {
            blockScoped: blockScope,
            global: this.parent === Scope.ROOT_SCOPE,
            name: name,
            writes: [],
            reads: [],
            possibleValue: null,
            scope: this
        };
        if (initialValue) {
            this.initialValues.set(variable, initialValue);
        }
        return variable;
    }

    createUnusedIdentifier(base:string):string {
        return createUnusedName(base, name => this.has(name));
    }

    getFunctionScopedVariables():Variable[] {
        const result:Variable[] = [];
        for (const name in this.variables) {
            /* istanbul ignore else */
            if (hasOwnProperty(this.variables, name)) {
                const variable = this.variables[name];
                if (!variable.blockScoped) {
                    result.push(variable);
                }
            }
        }
        return result;
    }

    hasFunctionScopedVariables():boolean {
        const variables = this.getFunctionScopedVariables();
        for (let i = 0; i < variables.length; i++) {
            const variable = variables[i];
            if (variable.writes.length > 0 || variable.reads.length > 0) {
                return true;
            }
        }
        return false;
    }

    findFunctionScope():Scope {
        if (!this.blockScope) {
            return this;
        }
        return this.parent.findFunctionScope();
    }

    getOuterValue(variable:Variable):Value {
        const name = variable.name;
        const parent = this.parent;

        if (!parent) {
            return unknown;
        }
        if (hasOwnProperty(parent.variables, name)) {
            if (parent.variables[name] !== variable) {
                return unknown;
            }
            return parent.variables[name].possibleValue || unknown;
        }
        return parent.getOuterValue(variable);
    }

    dereference(reference:ReferenceValue):HeapObject {
        if (this.possibleHeap && this.possibleHeap.has(reference)) {
            return this.possibleHeap.get(reference);
        }
        return this.parent.dereference(reference);
    }

    hasArgumentsRead():boolean {
        return this.get('arguments').reads.length > 0;
    }

    hasInitialValue(variable:Variable):boolean {
        if (this.initialValues.has(variable)) {
            return true;
        }
        if (this.parent) {
            return this.parent.hasInitialValue(variable);
        }
        return false;
    }

    createObject(objectClass:ObjectClass, heapObject:HeapObject):ReferenceValue {
        const reference = new ReferenceValue(objectClass);
        this.possibleHeap.set(reference, heapObject);
        return reference;
    }

    isBuiltIn(key:Object):boolean {
        return Scope.ROOT_SCOPE.hasObject(key);
    }

    isAncestorOf(other:Scope):boolean {
        const parent = other.parent;
        if (!parent) {
            return false;
        }
        if (parent === this) {
            return true;
        }
        return this.isAncestorOf(parent);
    }

    private setUnknownGlobal(name:string):Variable {
        if (this.parent !== Scope.ROOT_SCOPE) {
            return this.parent.setUnknownGlobal(name);
        }
        return this.set(name, false, null);
    }
}
Scope.ROOT_SCOPE.possibleHeap = new Map<ReferenceValue, HeapObject>();

SafeProperties.each(obj => Scope.ROOT_SCOPE.getReferenceValue(obj));

export = Scope;