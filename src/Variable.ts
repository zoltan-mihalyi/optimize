import {SemanticNode, IdentifierNode} from "./SemanticNode";
import {Value} from "./Value";
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
