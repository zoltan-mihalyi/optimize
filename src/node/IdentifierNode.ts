import {ExpressionNode} from "./ExpressionNode";
import {Variable} from "../Variable";
import {MemberNode, ExpressionStatementNode} from "./Others";
import {CallNode, NewNode} from "./CallNodes";
import {AssignmentNode} from "./Assignments";
import {VariableDeclaratorNode} from "./Variables";
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
        return this.scope.hasInitialValue(variable);
    }

    onTrack(state:EvaluationState) {
        if (this.isRead()) {
            let variable = this.getVariable();
            let value = state.getValue(variable);
            if (this.isOnlyRead()) {
                this.setValue(value);
            }

            if (this.canMakeDirty()) {
                state.makeDirtyAll(variable);
            }
        }
    }

    canMakeDirty() {
        const parent = this.parent;
        if (parent instanceof Later.ForEachNode) {
            return false;
        }
        if (parent instanceof MemberNode) {
            return false; // member node handles this
        }
        if (parent instanceof CallNode || parent instanceof NewNode) {
            if (parent.callee === this) {
                return false;
            }
        }
        if (parent instanceof AssignmentNode && parent.right === this && parent.parent instanceof ExpressionStatementNode) {
            return false;
        }
        if (parent instanceof VariableDeclaratorNode) {
            return false;
        }
        return true;
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

    isOnlyRead():boolean {
        if (this.parent instanceof Later.UpdateNode) {
            return false;
        }
        if (this.parent instanceof Later.AssignmentNode && this.parent.left === this) {
            return false;
        }
        return this.isRead();
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
        }
    }
}
Later.IdentifierNode = IdentifierNode;