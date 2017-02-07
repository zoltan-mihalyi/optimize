import {SemanticNode, IdentifierNode} from "./SemanticNode";
export interface Variable {
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialized:boolean;
}
