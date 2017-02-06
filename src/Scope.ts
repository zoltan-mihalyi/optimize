import {
    SemanticNode,
    AssignmentNode,
    UpdateNode,
    ForEachNode,
    IdentifierNode,
    VariableDeclaratorNode,
    FunctionDeclarationNode,
    FunctionExpressionNode
} from "./SemanticNode";
import {createUnusedName} from "./Utils";

interface Variable {
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialized:boolean;
}

interface Variables {
    [name:string]:Variable;
}

class Scope {
    private readonly blockScope:boolean;
    private readonly variables:Variables = {};

    constructor(private parent:Scope) {
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

    setUnknownGlobal(name:string):Variable{
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
            initialized: initialized,
            name: name,
            usages: [],
            writes: [],
            reads: []
        };
    }

    createUnusedIdentifier(base:string):string {
        return createUnusedName(base, name => this.has(name));
    }
}

export = Scope;