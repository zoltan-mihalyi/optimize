import {ExpressionNode} from "./ExpressionNode";
import {Value, KnownValue} from "../Value";
import Later = require("./Later");

export class LiteralNode extends ExpressionNode {
    value:any;
    raw:string;

    onTrack() {
    }

    protected isCleanInner():boolean {
        return true;
    }

    protected getInitialValue():Value {
        if (typeof this.value !== 'object' || this.value === null) {
            return new KnownValue(this.value);
        } else {
            return this.context.getObjectValue(this.value);
        }
    }
}
Later.LiteralNode = LiteralNode;