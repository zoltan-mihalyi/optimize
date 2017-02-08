import {createUnusedName} from "./Utils";
import {Variable} from "./Variable";

interface Variables {
    [name:string]:Variable;
}

class Scope {
    private readonly variables:Variables = {};

    constructor(private parent:Scope, private readonly blockScope:boolean) {
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
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
            return this.variables[name];
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        return null;
    }

    private setUnknownGlobal(name:string):Variable {
        if (this.parent) {
            return this.parent.setUnknownGlobal(name);
        }
        return this.set(name, false, false);
    }

    set(name:string, blockScope:boolean, initialized:boolean):Variable {
        if (!blockScope && this.blockScope) {
            return this.parent.set(name, false, initialized);
        }
        return this.variables[name] = {
            blockScoped: blockScope,
            global: !this.parent,
            initialized: initialized,
            name: name,
            usages: [], //todo remove
            writes: [],
            reads: []
        };
    }

    createUnusedIdentifier(base:string):string {
        return createUnusedName(base, name => this.has(name));
    }

    getFunctionScopedVariables():Variable[] {
        const result:Variable[] = [];
        for (const name in this.variables) {
            const variable = this.variables[name];
            if (!variable.blockScoped) {
                result.push(variable);
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
}

export = Scope;