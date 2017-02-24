import {ExpressionNode} from "./ExpressionNode";
import {binaryCache, hasTrueValue, getTrueValue} from "../Utils";
import {SingleValue, unknown, KnownValue} from "../Value";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class AssignmentNode extends ExpressionNode {
    left:ExpressionNode;
    operator:string;
    right:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.left.track(state, visitor);
        this.right.track(state, visitor);
        if (!(this.left instanceof Later.IdentifierNode)) {
            return;
        }
        const rightValue = this.right.getValue();
        const operator = this.operator;
        if (operator === '=') {
            state.setValue(this.left.getVariable(), rightValue);
            return;
        }

        const variable = this.left.getVariable();
        const leftValue = state.getValue(variable);

        const evaluator = binaryCache.get(operator.substring(0, operator.length - 1));
        state.setValue(variable, leftValue.product(rightValue, (left:SingleValue, right:SingleValue) => {
            if (hasTrueValue(left) && hasTrueValue(right)) {
                return this.context.createValue(evaluator(getTrueValue(left), getTrueValue(right)));
            }
            return unknown;
        }));
    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.left instanceof Later.IdentifierNode) {
            this.scope.getOrCreate(this.left.name).writes.push(this.left);
        }
    }
}
Later.AssignmentNode = AssignmentNode;

export class UpdateNode extends ExpressionNode {
    argument:ExpressionNode;
    operator:string;
    prefix:boolean;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        this.argument.track(state, visitor);
        if (!(this.argument instanceof Later.IdentifierNode)) {
            return;
        }
        const variable = this.argument.getVariable();
        state.setValue(variable, state.getValue(variable).map((value:SingleValue) => {
            if (hasTrueValue(value)) {
                let numberValue:number = +getTrueValue(value);
                return new KnownValue(this.operator === '++' ? numberValue + 1 : numberValue - 1);
            } else {
                return unknown;
            }
        }));
    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.argument instanceof Later.IdentifierNode) {
            this.scope.getOrCreate(this.argument.name).writes.push(this.argument);
        }
    }
}
Later.UpdateNode = UpdateNode;