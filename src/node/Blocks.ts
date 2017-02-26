import Scope = require("../Scope");
import {SemanticNode} from "./SemanticNode";
import {isInnerScoped} from "../Utils";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");
const global = new Function('return this')();

export class BlockNode extends SemanticNode {
    body:SemanticNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        const blockState = new EvaluationState(state, this.scope);
        if (this.parent instanceof Later.FunctionDeclarationNode || this.parent instanceof Later.AbstractFunctionExpressionNode) {
            this.parent.addArgumentsIfNeeded(state);
        }
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (node instanceof Later.FunctionDeclarationNode) {
                node.track(blockState, visitor);
            }
        }
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (!(node instanceof Later.FunctionDeclarationNode)) {
                node.track(blockState, visitor);
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

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.saveApi('undefined', state);
        this.saveApi('Infinity', state);
        this.saveApi('NaN', state);
        this.saveApi('eval', state);
        this.saveApi('isNaN', state);
        this.saveApi('parseFloat', state);
        this.saveApi('parseInt', state);
        this.saveApi('decodeURI', state);
        this.saveApi('decodeURIComponent', state);
        this.saveApi('encodeURI', state);
        this.saveApi('encodeURIComponent', state);
        this.saveApi('Object', state);
        this.saveApi('Function', state);
        this.saveApi('Array', state);
        this.saveApi('Boolean', state);
        this.saveApi('Error', state);
        this.saveApi('EvalError', state);
        this.saveApi('RangeError', state);
        this.saveApi('ReferenceError', state);
        this.saveApi('SyntaxError', state);
        this.saveApi('TypeError', state);
        this.saveApi('URIError', state);
        this.saveApi('Number', state);
        this.saveApi('String', state);
        this.saveApi('Boolean', state);
        this.saveApi('RegExp', state);
        this.saveApi('Math', state);
        this.saveApi('Date', state);

        super.onTrack(state, visitor);
    }

    protected handleDeclarationsForNode() {
    }

    private saveApi(name:string, state:EvaluationState) {
        this.scope.set(name, true, state.createValue(global[name]));
    }
}