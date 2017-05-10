import {ExpressionNode} from "./ExpressionNode";
import {Value, PrimitiveValue} from "../tracking/Value";
import Later = require("./Later");
import EvaluationState = require("../tracking/EvaluationState");

export class LiteralNode extends ExpressionNode {
    value:any;
    raw:string;

    onTrack(state:EvaluationState) {
        let value:Value;
        if (typeof this.value !== 'object' || this.value === null) {
            value = new PrimitiveValue(this.value);
        } else {
            value = state.getReferenceValue(this.value);
        }
        this.setValue(value);
    }

    protected isCleanInner():boolean {
        return true;
    }
}
Later.LiteralNode = LiteralNode;