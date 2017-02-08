import {SemanticNode, IdentifierNode} from "./SemanticNode";
export interface Variable {
    global:boolean;
    blockScoped:boolean;
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialized:boolean;
}
