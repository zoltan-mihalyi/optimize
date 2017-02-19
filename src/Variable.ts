import {Value} from "./Value";
import {SemanticNode} from "./node/SemanticNode";
import Scope = require("./Scope");
import {IdentifierNode} from "./node/IdentifierNode";

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
