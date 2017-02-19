import EvaluationState = require("../EvaluationState");
import {SemanticNode} from "./SemanticNode";
import Scope = require("../Scope");
import {unknown} from "../Value";
import Later = require("./Later");
import {IdentifierNode} from "./IdentifierNode";
import {ExpressionNode} from "./ExpressionNode";

export class VariableDeclarationNode extends SemanticNode {
    declarations:VariableDeclaratorNode[];
    kind:'var'|'const'|'let';

    isBlockScoped() {
        return this.kind !== 'var';
    }

    track(state:EvaluationState) {
        for (let i = 0; i < this.declarations.length; i++) {
            this.declarations[i].track(state);
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

    track(state:EvaluationState) {
        if (this.init) {
            this.init.track(state);
            state.setValue(this.id.getVariable(), this.init.getValue());
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
            variable = this.scope.set(this.id.name, blockScoped, blockScoped ? null : unknown);
            isWrite = !!this.init;
        }
        if (isWrite) {
            variable.writes.push(this.id);
        }
    }
}
Later.VariableDeclaratorNode = VariableDeclaratorNode;