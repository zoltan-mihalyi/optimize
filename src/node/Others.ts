import EvaluationState = require("../EvaluationState");
import {ExpressionNode} from "./ExpressionNode";
import {SemanticNode} from "./SemanticNode";
import {KnownValue, Value} from "../Value";
import {IdentifierNode} from "./IdentifierNode";
import Later = require("./Later");

export class EmptyNode extends SemanticNode {
    track() {
    }
}

export class ExpressionStatementNode extends SemanticNode {
    expression:ExpressionNode;
    directive?:string;

    isDirective():boolean {
        return typeof this.directive === 'string';
    }

    track(state:EvaluationState) {
        this.expression.track(state);
    }
}

export class MemberNode extends ExpressionNode {
    object:ExpressionNode;
    property:ExpressionNode;
    computed:boolean;

    protected isCleanInner():boolean {
        return false; //todo
    }

    track(state:EvaluationState) {
        this.object.track(state);
        this.property.track(state);
    }

    getPropertyValue():Value {
        return !this.computed ? new KnownValue((this.property as IdentifierNode).name) : this.property.getValue();
    }
}
Later.MemberNode = MemberNode;

export class ThisNode extends ExpressionNode {
    protected isCleanInner():boolean {
        return true;
    }

    track(state:EvaluationState) {
    }
}

export class SequenceNode extends ExpressionNode {
    expressions:ExpressionNode[];

    track(state:EvaluationState) {
        for (let i = 0; i < this.expressions.length; i++) {
            this.expressions[i].track(state);
        }
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.expressions.length; i++) {
            if (!this.expressions[i].isClean()) {
                return false;
            }
        }
        return true;
    }
}
