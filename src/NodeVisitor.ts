import {SemanticNode} from "./node/SemanticNode";
import EvaluationState = require("./EvaluationState");

type Constructor<T> = new(...args:any[]) => T;
type Callback<N extends SemanticNode, P> = (node:N, payload?:P) => void;

type SimpleCallback = (node:SemanticNode) => void;

function callCallbacks(callbacks:SimpleCallback[], node:SemanticNode) {
    for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](node);
    }
}

class Visitor<P> {
    private store:{type:Constructor<SemanticNode>, callback:Callback<SemanticNode,P>}[] = [];
    private endCallbacks:SimpleCallback[] = [];
    private startCallbacks:SimpleCallback[] = [];

    callAll(node:SemanticNode, payload?:P):void {
        for (let i = 0; i < this.store.length; i++) {
            const callback = this.store[i];
            if (node instanceof callback.type) {
                callback.callback(node, payload);
            }
        }
    }

    callStart(node:SemanticNode) {
        callCallbacks(this.startCallbacks, node);
    }

    callEnd(node:SemanticNode) {
        callCallbacks(this.endCallbacks, node);
    }

    onStart(callback:SimpleCallback) {
        this.startCallbacks.push(callback);
    }

    onEnd(callback:SimpleCallback) {
        this.endCallbacks.push(callback);
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