import Scope = require("../Scope");
import {SemanticNode} from "./SemanticNode";
import EvaluationState = require("../EvaluationState");
import {isInnerScoped} from "../Utils";
import Later = require("./Later");
const global = new Function('return this')();

export class BlockNode extends SemanticNode {
    body:SemanticNode[];

    track(state:EvaluationState) {
        const blockState = new EvaluationState(state, this.scope);
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (node instanceof Later.FunctionDeclarationNode) {
                node.track(blockState);
            }
        }
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (!(node instanceof Later.FunctionDeclarationNode)) {
                node.track(blockState);
            }
        }
        state.mergeBack(blockState);

    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        const parent = this.parent;
        if (isInnerScoped(parent)) {
            return parent.innerScope;
        }
        return new Scope(scope, !!parent);
    }
}
Later.BlockNode = BlockNode;

export class ProgramNode extends BlockNode {
    errors:any[];
    sourceType:string;

    protected handleDeclarationsForNode() {
        this.saveApi('undefined');
        this.saveApi('Infinity');
        this.saveApi('NaN');
        this.saveApi('eval');
        this.saveApi('isNaN');
        this.saveApi('parseFloat');
        this.saveApi('parseInt');
        this.saveApi('decodeURI');
        this.saveApi('decodeURIComponent');
        this.saveApi('encodeURI');
        this.saveApi('encodeURIComponent');
        this.saveApi('Object');
        this.saveApi('Function');
        this.saveApi('Array');
        this.saveApi('Boolean');
        this.saveApi('Error');
        this.saveApi('EvalError');
        this.saveApi('RangeError');
        this.saveApi('ReferenceError');
        this.saveApi('SyntaxError');
        this.saveApi('TypeError');
        this.saveApi('URIError');
        this.saveApi('Number');
        this.saveApi('String');
        this.saveApi('Boolean');
        this.saveApi('RegExp');
        this.saveApi('Math');
        this.saveApi('Date');
    }

    private saveApi(name:string) {
        this.scope.set(name, true, this.context.createValue(global[name]));
    }
}