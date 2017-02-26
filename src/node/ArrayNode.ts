import {ExpressionNode} from "./ExpressionNode";
import {Value, PropDescriptorMap, PrimitiveValue, ReferenceValue, ARRAY, PropInfo, HeapObject} from "../Value";
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

        if(!this.isClean()){
            return;
        }
        const properties:PropDescriptorMap = {
            length: {
                enumerable: false,
                value: new PrimitiveValue(this.elements.length)
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
            if (trueValue && hasTrueValue(value, state)) {
                trueValue.push(getTrueValue(value, state));
            } else {
                trueValue = null;
            }
        }

        this.setValue(state.saveObject(new HeapObject(ARRAY, {
            proto: state.getReferenceValue(Array.prototype),
            properties: properties,
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: trueValue
        })));
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
}