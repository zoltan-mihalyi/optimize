import {HeapObject, ReferenceValue, Value} from "./Value";
import {SemanticNode} from "./node/SemanticNode";
import Scope = require("./Scope");
import {IdentifierNode} from "./node/IdentifierNode";
import Map = require("./Map");

export type Heap = Map<ReferenceValue, HeapObject>;

export interface Variable {
    global:boolean;
    blockScoped:boolean;
    usages:SemanticNode[];
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    initialValue:Value;
    initialHeap:Heap;
    scope:Scope;
}
