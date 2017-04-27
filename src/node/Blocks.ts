import Scope = require("../Scope");
import {SemanticNode} from "./SemanticNode";
import {isInnerScoped} from "../Utils";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");
const global = new Function('return this')();

const GLOBAL_APIS = [
    'undefined',
    'Infinity',
    'NaN',
    'eval',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'Object',
    'Function',
    'Array',
    'Boolean',
    'Error',
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    'Number',
    'String',
    'Boolean',
    'RegExp',
    'Math',
    'Date'
];

export class BlockNode extends SemanticNode {
    body:SemanticNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        const blockState = new EvaluationState(state, this.scope, this.context);
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
        GLOBAL_APIS.forEach(name => state.setValue(this.scope.getOrCreate(name), state.createValue(global[name]), true));

        super.onTrack(state, visitor);
    }

    protected handleDeclarationsForNode() {
        GLOBAL_APIS.forEach(name => this.scope.set(name, true, null));
    }
}