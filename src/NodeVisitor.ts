import {SemanticNode} from "./SemanticNode";

type Constructor<T> = new(...args) => T;
type Callback<T extends SemanticNode> = (node:T) => void;

class NodeVisitor {
    private store:{type:Constructor<SemanticNode>, callback:Callback<SemanticNode>}[] = [];

    callAll(node:SemanticNode):void {
        for (let i = 0; i < this.store.length; i++) {
            const callback = this.store[i];
            if (node instanceof callback.type) {
                callback.callback(node);
            }
        }
    }

    on<T extends SemanticNode>(type:Constructor<T>, callback:Callback<T>) {
        this.store.push({
            type: type,
            callback: callback
        });
    }
}
export = NodeVisitor;
