import EvaluationState = require("../tracking/EvaluationState");
import {SemanticNode} from "./SemanticNode";
import {PrimitiveValue, unknown} from "../tracking/Value";
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import Scope = require("../tracking/Scope");
import Later = require("./Later");

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
            state.setValue(this.id.getVariable(), this.init.getValue(), false);
        } else if (this.parent.isBlockScoped()) {
            state.setValue(this.id.getVariable(), new PrimitiveValue(void 0), false);
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
                variable.scope.initialValues.set(variable, variable.global ? unknown : new PrimitiveValue(void 0));
            }
            isWrite = !!this.init;
        }
        if (isWrite) {
            variable.writes.push(this.id);
        }
    }
}
Later.VariableDeclaratorNode = VariableDeclaratorNode;