import {createUnusedName, hasOwnProperty} from "./Utils";
import {Variable} from "./Variable";
import {Value} from "./Value";

interface Variables {
    [name:string]:Variable;
}

class Scope {
    private readonly variables:Variables = {};

    constructor(private parent:Scope, readonly blockScope:boolean) {
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
        return this.variables[name] = {
            blockScoped: blockScope,
            global: !this.parent,
            name: name,
            usages: [], //todo remove
            writes: [],
            reads: [],
            initialValue: initialValue,
            scope: this
        };
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

    hasArgumentsRead():boolean {
        return this.get('arguments').reads.length > 0;
    }

    private setUnknownGlobal(name:string):Variable {
        if (this.parent) {
            return this.parent.setUnknownGlobal(name);
        }
        return this.set(name, false, null);
    }
}

export = Scope;