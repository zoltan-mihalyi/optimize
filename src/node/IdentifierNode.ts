import {ExpressionNode} from "./ExpressionNode";
import {Variable} from "../Variable";
import EvaluationState = require("../EvaluationState");
import Scope = require("../Scope");
import Later = require("./Later");

export class IdentifierNode extends ExpressionNode {
    readonly name:string;

    protected isCleanInner():boolean {
        let variable = this.getVariable();
        if (!variable) {
            return false;
        }
        return !!variable.initialValue;
    }

    track(state:EvaluationState) {
        if (this.isWrite()) {
            return;
        }
        let variable = this.getVariable();
        this.setValue(state.getValue(variable));
    }

    getVariable():Variable {
        return this.scope.get(this.name);
    }

    isReal():boolean {
        if (this.parent instanceof Later.AbstractFunctionExpressionNode && this.parent.id === this) {
            return false;
        }
        if (this.parent instanceof Later.LabeledNode) {
            return false;
        }
        if (this.parent instanceof Later.BreakNode || this.parent instanceof Later.ContinueNode) {
            return false;
        }
        if (this.parent instanceof Later.PropertyNode && this.parent.key === this && !this.parent.computed) {
            return false;
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof Later.MemberNode && this.parent.property === this && !this.parent.computed) {
            return false;
        }
        return true;
    }

    isRead():boolean {
        if (!this.isReal()) {
            return false;
        }

        if (this.parent instanceof Later.ForEachNode && this.parent.left === this) {
            return false;
        }
        if (this.parent instanceof Later.VariableDeclaratorNode && this.parent.id === this) {
            return false; //just initializing
        }
        if (this.parent instanceof Later.FunctionDeclarationNode) {
            return false; //function declaration/parameter
        }
        if (this.parent instanceof Later.AbstractFunctionExpressionNode) {
            return false; //function expression name/parameter
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof Later.AssignmentNode && this.parent.left === this) {
            return this.parent.operator !== '=';
        }
        return true;
    }

    isWrite():boolean {
        if (this.parent instanceof Later.UpdateNode) {
            return true;
        }
        if (this.parent instanceof Later.AssignmentNode && this.parent.left === this) {
            return true;
        }
        return !this.isRead();
    }

    refersToSame(identifier:IdentifierNode):boolean {
        if (!identifier.isReal()) {
            return false;
        }
        return this.scope.getOrCreate(this.name) === identifier.scope.getOrCreate(identifier.name);
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof Later.FunctionDeclarationNode || this.parent instanceof Later.AbstractFunctionExpressionNode) {
            if (this.parentProperty !== "id") {
                return this.parent.innerScope;
            }
        }
        return super.createSubScopeIfNeeded(scope);
    }

    protected updateAccessForNode() {
        if (this.isRead()) {
            let variable = this.scope.getOrCreate(this.name);
            variable.reads.push(this);
            if (variable.initialValue) {
                this.setValue(variable.initialValue);
            }
        }
    }
}
Later.IdentifierNode = IdentifierNode;