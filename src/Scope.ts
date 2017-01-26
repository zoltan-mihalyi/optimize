import {SemanticNode, AssignmentNode, UpdateNode, ForEachNode, IdentifierNode} from "./SemanticNode";

interface Variable {
    usages:SemanticNode[];
    writes:(AssignmentNode | UpdateNode | ForEachNode)[];
    reads:IdentifierNode[];
    name:string;
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
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
            return true;
        }
        if (this.parent) {
            return this.parent.has(name);
        }
        return false;
    }

    get(name:string):Variable {
        if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
            return this.variables[name];
        }
        if (this.parent) {
            return this.parent.get(name);
        }
        return this.set(name, false);
    }

    set(name:string, blockScope:boolean):Variable { //todo pass usage
        if (!blockScope && this.blockScope) {
            this.parent.set(name, false);
        }
        return this.variables[name] = {
            name: name,
            usages: [],
            writes: [],
            reads: []
        };
    }
}

export = Scope;