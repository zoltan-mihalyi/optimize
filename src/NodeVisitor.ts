import {SemanticNode} from "./node/SemanticNode";
import EvaluationState = require("./EvaluationState");

type Constructor<T> = new(...args:any[]) => T;
type Callback<N extends SemanticNode, P> = (node:N, payload?:P) => void;

class Visitor<P> {
    private store:{type:Constructor<SemanticNode>, callback:Callback<SemanticNode,P>}[] = [];

    callAll(node:SemanticNode, payload?:P):void {
        for (let i = 0; i < this.store.length; i++) {
            const callback = this.store[i];
            if (node instanceof callback.type) {
                callback.callback(node, payload);
            }
        }
    }

    on<T extends SemanticNode>(type:Constructor<T>, callback:Callback<T,P>) {
        this.store.push({
            type: type,
            callback: callback
        });
    }
}

export class NodeVisitor extends Visitor<void> {
}

export class TrackingVisitor extends Visitor<EvaluationState> {

}