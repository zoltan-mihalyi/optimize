import {IdentifierNode} from "./Nodes";
import {Value} from "./Value";
import {SemanticNode} from "./node/SemanticNode";
import Scope = require("./Scope");

export interface Variable {
    global:boolean;
    blockScoped:boolean;
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialValue:Value;
    scope:Scope;
}
