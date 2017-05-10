import {HeapObject, ReferenceValue, Value} from "./Value";
import Scope = require("./Scope");
import {IdentifierNode} from "./node/IdentifierNode";
import Map = require("./Map");

export type Heap = Map<ReferenceValue, HeapObject>;

export interface Variable {
    global:boolean;
    blockScoped:boolean;
    writes:IdentifierNode[];
    reads:IdentifierNode[];
    name:string;
    possibleValue:Value;
    scope:Scope;
}
