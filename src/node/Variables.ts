import EvaluationState = require("../EvaluationState");
import {SemanticNode} from "./SemanticNode";
import Scope = require("../Scope");
import {PrimitiveValue, unknown} from "../Value";
import Later = require("./Later");
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../NodeVisitor";

export class VariableDeclarationNode extends SemanticNode {
    declarations:VariableDeclaratorNode[];
    kind:'var' | 'const' | 'let';

    isBlockScoped() {
        return this.kind !== 'var';
    }

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        for (let i = 0; i < this.declarations.length; i++) {
            this.declarations[i].track(state, visitor);
        }
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof Later.ForEachNode) {
            return this.parent.innerScope;
        }
        return super.createSubScopeIfNeeded(scope);
    }
}
Later.VariableDeclarationNode = VariableDeclarationNode;

export class VariableDeclaratorNode extends SemanticNode {
    parent:VariableDeclarationNode;
    id:IdentifierNode;
    init:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        if (this.init) {
            this.init.track(state, visitor);
            state.setValue(this.id.getVariable(), this.init.getValue());
        } else if (this.parent.isBlockScoped()) {
            state.setValue(this.id.getVariable(), new PrimitiveValue(void 0));
        }
    }

    protected handleDeclarationsForNode() {
        const parent = this.parent;
        let blockScoped = parent.isBlockScoped();
        let variable;
        let isWrite;
        if (parent.parent instanceof Later.ForEachNode) {
            variable = parent.parent.body.scope.set(this.id.name, blockScoped, unknown);
            isWrite = true;
        } else {
            variable = this.scope.set(this.id.name, blockScoped, null);
            if (!blockScoped) { //assign initialValue later, because var scope can be different
                variable.initialValue = variable.global ? unknown : new PrimitiveValue(void 0);
            }
            isWrite = !!this.init;
        }
        if (isWrite) {
            variable.writes.push(this.id);
        }
    }
}
Later.VariableDeclaratorNode = VariableDeclaratorNode;