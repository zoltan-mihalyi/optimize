import {ExpressionNode} from "./ExpressionNode";
import {ARRAY, HeapObject, KNOWS_ALL, PrimitiveValue, PropDescriptorMap} from "../tracking/Value";
import {getTrueValue, hasTrueValue} from "../utils/Utils";
import {TrackingVisitor} from "../utils/NodeVisitor";
import EvaluationState = require("../tracking/EvaluationState");

export class ArrayNode extends ExpressionNode {
    elements:ExpressionNode[];

    onTrack(state:EvaluationState, trackingVisitor:TrackingVisitor) {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.track(state, trackingVisitor);
        }

        if (!this.isClean()) {
            return;
        }
        const properties:PropDescriptorMap = {
            length: {
                enumerable: false,
                writable: true,
                value: new PrimitiveValue(this.elements.length),
                hiddenSetter: true
            }
        };
        let trueValue:any[] = [];
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            let value = element.getValue();
            properties[i] = {
                enumerable: true,
                writable: true,
                value: value
            };
            if (trueValue && hasTrueValue(value, state)) {
                trueValue.push(getTrueValue(value, state));
            } else {
                trueValue = null;
            }
        }

        this.setValue(state.createObject(ARRAY, new HeapObject({
            proto: state.getReferenceValue(Array.prototype),
            properties: properties,
            propertyInfo: KNOWS_ALL,
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