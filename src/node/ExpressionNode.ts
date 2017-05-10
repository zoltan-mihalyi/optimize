import recast = require("recast");
import {PrimitiveValue, unknown, UnknownValue, Value} from "../tracking/Value";
import {equals, isValueUpdate} from "../utils/Utils";
import {SemanticNode} from "./SemanticNode";
import {AbstractFunctionExpressionNode, LiteralNode, UnaryNode} from "./Later";
import Scope = require("../tracking/Scope");

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
    protected calculatedValue:Value = unknown;

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
        if (value instanceof PrimitiveValue) {
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

        if (isValueUpdate(this.calculatedValue, value)) {
            this.markUpdated();
        }
        this.calculatedValue = value;
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof AbstractFunctionExpressionNode && this.parentProperty === 'body') {
            return this.parent.innerScope;
        }
        return super.createSubScopeIfNeeded(scope);
    }

    protected abstract isCleanInner():boolean;
}
