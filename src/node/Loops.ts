import {SemanticNode} from "./SemanticNode";
import {unknown} from "../Value";
import {ExpressionNode} from "./ExpressionNode";
import {InnerScoped} from "../Utils";
import {IdentifierNode} from "./IdentifierNode";
import {VariableDeclarationNode} from "./Variables";
import EvaluationState = require("../EvaluationState");
import Scope = require("../Scope");
import Later = require("./Later");

export abstract class LoopNode extends SemanticNode {
    body:SemanticNode;
}

export class DoWhileNode extends LoopNode {
    test:ExpressionNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.body.track(state);
            this.test.track(state);
        });
    }
}
export abstract class ForEachNode extends LoopNode implements InnerScoped {
    left:IdentifierNode|VariableDeclarationNode;
    right:ExpressionNode;
    innerScope:Scope;

    protected updateAccessForNode() {
        if (this.left instanceof IdentifierNode) {
            this.scope.getOrCreate(this.left.name).writes.push(this.left);
        }
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        this.innerScope = new Scope(scope, true);
        return super.createSubScopeIfNeeded(scope);
    }

    track(state:EvaluationState) {
        this.right.track(state);
        state.trackAsUnsure(state => {
            const identifier = this.left instanceof IdentifierNode ? this.left : this.left.declarations[0].id;
            state.setValue(identifier.getVariable(), unknown);
            this.body.track(state);
        });
    }
}
Later.ForEachNode = ForEachNode;

export class ForInNode extends ForEachNode {
}

export class ForOfNode extends ForEachNode {
}

export class ForNode extends LoopNode {
    init:SemanticNode;
    test:ExpressionNode;
    update:SemanticNode;

    track(state:EvaluationState) {
        if (this.init) {
            this.init.track(state);
        }
        state.trackAsUnsure(state => {
            if (this.test) {
                this.test.track(state);
            }
            this.body.track(state);
            if (this.update) {
                this.update.track(state);
            }
        });
    }
}


export class WhileNode extends LoopNode {
    test:ExpressionNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.test.track(state);
            this.body.track(state);
        });
    }
}
