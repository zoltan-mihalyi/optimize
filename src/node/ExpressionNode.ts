import recast = require("recast");
import {Value, unknown, UnknownValue, KnownValue} from "../Value";
import {equals} from "../Utils";
import {SemanticNode} from "./SemanticNode";
import {LiteralNode, UnaryNode, AbstractFunctionExpressionNode} from "./Later";
import Scope = require("../Scope");

const builders = recast.types.builders;

function isVoid0(expression:ExpressionNode):boolean {
    if (expression instanceof UnaryNode && expression.operator === 'void') {
        let argument = expression.argument;
        if (argument instanceof LiteralNode && argument.value === 0) {
            return true;
        }
    }
    return false;
}

function isNegatedNumber(expression:ExpressionNode, primitiveValue:number):boolean {
    if (expression instanceof UnaryNode && expression.operator === '-') {
        let argument = expression.argument;
        if (argument instanceof LiteralNode && argument.value === -primitiveValue) {
            return true;
        }
    }
    return false;
}


export abstract class ExpressionNode extends SemanticNode {
    protected calculatedValue:Value = this.isClean() ? this.getInitialValue() : unknown;

    isClean():boolean {
        if (this.calculatedValue && !(this.calculatedValue instanceof UnknownValue)) {
            return true;
        } else {
            return this.isCleanInner();
        }
    }

    getValue():Value {
        return this.calculatedValue;
    }

    setValue(value:Value) {
        if (value instanceof UnknownValue) {
            return;
        }
        if (value instanceof KnownValue) {
            let primitiveValue = value.value;
            if (primitiveValue === void 0) {
                if (!isVoid0(this)) {
                    this.replaceWith([builders.unaryExpression('void', builders.literal(0), true)]);
                }
            } else if (typeof primitiveValue === 'number' && (primitiveValue < 0 || 1 / primitiveValue < 0)) {
                if (!isNegatedNumber(this, primitiveValue)) {
                    this.replaceWith([builders.unaryExpression('-', builders.literal(-primitiveValue))]);
                }
            } else {
                if (!(this instanceof LiteralNode) || !equals(this.value, primitiveValue)) {
                    this.replaceWith([builders.literal(primitiveValue)]);
                    return;
                }
            }
        }

        if (this.calculatedValue.equals(value)) {
            return;
        }

        this.calculatedValue = value;
        this.markUpdated();
    }

    protected markUpdated() {
        super.markUpdated();
        if (this.calculatedValue instanceof UnknownValue && this.isClean()) {
            this.calculatedValue = this.getInitialValue();
        }
    }

    protected getInitialValue():Value {
        return unknown;
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof AbstractFunctionExpressionNode && this.parentProperty === 'body') {
            return this.parent.innerScope;
        }
        return super.createSubScopeIfNeeded(scope);
    }

    protected abstract isCleanInner():boolean;
}
