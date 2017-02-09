import {SemanticNode, IdentifierNode} from "./SemanticNode";
import {Value} from "./Value";
export interface Variable {
    global:boolean;
    blockScoped:boolean;
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialized:boolean;
    constantValue:Value;
}
