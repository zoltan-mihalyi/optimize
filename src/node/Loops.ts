import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {InnerScoped} from "../utils/Utils";
import {IdentifierNode} from "./IdentifierNode";
import {VariableDeclarationNode} from "./Variables";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {unknown} from "../tracking/Value";
import EvaluationState = require("../tracking/EvaluationState");
import Scope = require("../tracking/Scope");
import Later = require("./Later");

export abstract class LoopNode extends SemanticNode {
    body:SemanticNode;
}

export class DoWhileNode extends LoopNode {
    test:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        state.trackAsUnsure(visitor, [this.body, this.test], true);
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

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.right.track(state, visitor);
        const identifier = this.left instanceof IdentifierNode ? this.left : this.left.declarations[0].id;
        state.setValue(identifier.getVariable(), unknown, true);

        state.trackAsUnsure(visitor, [this.body], true);
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

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        if (this.init) {
            this.init.track(state, visitor);
        }
        const nodes = [];
        if (this.test) {
            nodes.push(this.test);
        }
        nodes.push(this.body);
        if (this.update) {
            nodes.push(this.update);
        }
        state.trackAsUnsure(visitor, nodes, true);
    }
}


export class WhileNode extends LoopNode {
    test:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        state.trackAsUnsure(visitor, [this.test, this.body], true);
    }
}
