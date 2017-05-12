import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {unknown, ARGUMENTS, HeapObject, NO_UNKNOWN_OVERRIDE} from "../tracking/Value";
import {InnerScoped} from "../utils/Utils";
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";
import Scope = require("../tracking/Scope");
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");
import {ReturnNode} from "./JumpNodes";

function addParametersToScope(node:FunctionNode, addArguments:boolean) {
    const params = node.params;
    const scope = node.innerScope;
    for (let i = 0; i < params.length; i++) {
        scope.set(params[i].name, false, unknown).writes.push(params[i]);
    }
    if (addArguments) {
        scope.set('arguments', false, unknown);
    }
}

function addArgumentsValue(node:FunctionNode, state:EvaluationState) {
    const argumentsRef = state.createObject(ARGUMENTS, new HeapObject({
        proto: state.getReferenceValue(Object.prototype),
        properties: {},
        propertyInfo: NO_UNKNOWN_OVERRIDE,
        trueValue: null
    }));
    state.setValue(node.innerScope.get('arguments'), argumentsRef, true);
}

function createInnerScope(node:InnerScoped, scope:Scope) {
    node.innerScope = new Scope(scope, false);
    return scope;
}

export interface FunctionNode extends InnerScoped {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:ExpressionNode | BlockNode;
    callCount:number;
    returns:ReturnNode[];
    usesThis:boolean;

    addArgumentsIfNeeded(state:EvaluationState):void;
}

export abstract class AbstractFunctionExpressionNode extends ExpressionNode implements FunctionNode {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:ExpressionNode | BlockNode;
    innerScope:Scope;
    expression:boolean;
    callCount:number = null;
    returns:ReturnNode[] = [];
    usesThis = false;

    onTrack(state:EvaluationState) {
        this.setValue(state.createCustomFunctionReference(this));
    }

    addArgumentsIfNeeded(state:EvaluationState) {
        if (!this.isLambda()) {
            addArgumentsValue(this, state);
        }
    }

    protected isCleanInner():boolean {
        return true;
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this, !this.isLambda());
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        return createInnerScope(this, scope);
    }

    abstract isLambda():boolean;
}
Later.AbstractFunctionExpressionNode = AbstractFunctionExpressionNode;

export class ArrowFunctionExpressionNode extends AbstractFunctionExpressionNode {
    isLambda():boolean {
        return true;
    }
}

export class FunctionDeclarationNode extends SemanticNode implements FunctionNode {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:BlockNode;
    innerScope:Scope;
    callCount:number = null;
    returns:ReturnNode[] = [];
    usesThis = false;

    onTrack(state:EvaluationState) {
        state.setValue(this.id.getVariable(), state.createCustomFunctionReference(this), true);
    }

    addArgumentsIfNeeded(state:EvaluationState) {
        addArgumentsValue(this, state);
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this, true);
        let variable = this.scope.set(this.id.name, false, null);
        variable.writes.push(this.id);
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        return createInnerScope(this, scope);
    }
}
Later.FunctionDeclarationNode = FunctionDeclarationNode;

export class FunctionExpressionNode extends AbstractFunctionExpressionNode {
    isLambda():boolean {
        return false;
    }
}