import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {unknown, ARGUMENTS, PropInfo, HeapObject} from "../Value";
import {InnerScoped} from "../Utils";
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";
import Scope = require("../Scope");
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

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
        propertyInfo: PropInfo.MAY_HAVE_NEW, //todo no override, but enumerable. separate!!!
        trueValue: null
    }));
    state.setValue(node.innerScope.get('arguments'), argumentsRef);
}

function createInnerScope(node:InnerScoped, scope:Scope) {
    node.innerScope = new Scope(scope, false);
    return scope;
}

export interface FunctionNode extends InnerScoped {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:ExpressionNode | BlockNode;
}

export abstract class AbstractFunctionExpressionNode extends ExpressionNode implements FunctionNode {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:ExpressionNode | BlockNode;
    innerScope:Scope;
    expression:boolean;

    onTrack(state:EvaluationState) {
        this.setValue(state.createCustomFunctionReference(this));
    }

    addArgumentsIfNeeded(state:EvaluationState) {
        if (!this.isLambda()) {
            addArgumentsValue(this, state);
        }
    }

    getReturnExpression():ExpressionNode {
        let body = this.body;
        if (this.expression) {
            return body as ExpressionNode;
        } else if (body instanceof Later.BlockNode && body.body.length === 1) {
            const statement = body.body[0];
            if (statement instanceof Later.ReturnNode) {
                return statement.argument;
            }
        }
        return null;
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

    onTrack(state:EvaluationState) {
        state.setValue(this.id.getVariable(), state.createCustomFunctionReference(this));
    }

    addArgumentsIfNeeded(state:EvaluationState) {
        addArgumentsValue(this, state);
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this, true);
        let variable = this.scope.set(this.id.name, false, unknown);
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