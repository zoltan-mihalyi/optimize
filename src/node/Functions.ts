import {SemanticNode} from "./SemanticNode";
import {ExpressionNode} from "./ExpressionNode";
import {unknown, ObjectValue, ARGUMENTS, PropInfo, Value} from "../Value";
import {InnerScoped} from "../Utils";
import Scope = require("../Scope");
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");
import {IdentifierNode} from "./IdentifierNode";
import {BlockNode} from "./Blocks";

function addParametersToScope(node:FunctionDeclarationNode|AbstractFunctionExpressionNode, addArguments:boolean) {
    const params = node.params;
    const scope = node.body.scope;
    for (let i = 0; i < params.length; i++) {
        scope.set(params[i].name, false, unknown).writes.push(params[i]);
    }
    if (addArguments) {
        scope.set('arguments', false, new ObjectValue(ARGUMENTS, {
            proto: node.context.getObjectValue(Object.prototype),
            properties: {},
            propertyInfo: PropInfo.MAY_HAVE_NEW, //todo no override, but enumerable. separate!!!
            trueValue: null
        }));
    }
}

export abstract class AbstractFunctionExpressionNode extends ExpressionNode implements InnerScoped {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:ExpressionNode|BlockNode;
    innerScope:Scope;
    expression:boolean;

    track() {
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

    protected createSubScopeIfNeeded(scope:Scope):Scope { //todo duplicate
        this.innerScope = new Scope(scope, false);
        return scope;
    }

    protected getInitialValue():Value {
        return this.context.createCustomFunctionValue(this.params.length);
    }

    protected abstract isLambda():boolean;
}
Later.AbstractFunctionExpressionNode = AbstractFunctionExpressionNode;

export class ArrowFunctionExpressionNode extends AbstractFunctionExpressionNode {
    protected isLambda():boolean {
        return true;
    }
}

export class FunctionDeclarationNode extends SemanticNode implements InnerScoped {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:BlockNode;
    innerScope:Scope;

    track(state:EvaluationState) {
        state.setValue(this.id.getVariable(), this.context.createCustomFunctionValue(this.params.length));
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this, true);
        let variable = this.scope.set(this.id.name, false, unknown);
        variable.writes.push(this.id);
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        this.innerScope = new Scope(scope, false);
        return scope;
    }
}
Later.FunctionDeclarationNode = FunctionDeclarationNode;

export class FunctionExpressionNode extends AbstractFunctionExpressionNode {
    protected isLambda():boolean {
        return false;
    }
}