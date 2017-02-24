import {ExpressionNode} from "./ExpressionNode";
import {Value, PropDescriptorMap, KnownValue, ObjectValue, ARRAY, PropInfo} from "../Value";
import {hasTrueValue, getTrueValue} from "../Utils";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");

export class ArrayNode extends ExpressionNode {
    elements:ExpressionNode[];

    onTrack(state:EvaluationState, trackingVisitor:TrackingVisitor) {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.track(state, trackingVisitor);
        }
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (!element.isClean()) {
                return false;
            }
        }
        return true;
    }

    protected getInitialValue():Value {
        const properties:PropDescriptorMap = {
            length: {
                enumerable: false,
                value: new KnownValue(this.elements.length)
            }
        };
        let trueValue:any[] = [];
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            let value = element.getValue();
            properties[i] = {
                enumerable: true,
                value: value
            };
            if (trueValue && hasTrueValue(value)) {
                trueValue.push(getTrueValue(value));
            } else {
                trueValue = null;
            }
        }
        return new ObjectValue(ARRAY, {
            proto: this.context.getObjectValue(Array.prototype),
            properties: properties,
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: trueValue
        });
    }
}