import {SingleValue, PrimitiveValue} from "../../tracking/Value";
import {throwValue, hasTrueValue, getTrueValue} from "../../utils/Utils";
import {MemberNode} from "../../node/Others";
import {TrackingVisitor} from "../../utils/NodeVisitor";
import EvaluationState = require("../../tracking/EvaluationState");

export  = (nodeVisitor:TrackingVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode, state:EvaluationState) => {
        if (!node.computed) {
            return;
        }
        let propertyValue = node.property.getValue().map((propertyValue:SingleValue) => {
            if (hasTrueValue(propertyValue, state)) {
                try {
                    let string = getTrueValue(propertyValue, state) + '';
                    let number = toNumber(string);
                    return new PrimitiveValue(number === null ? string : number);
                } catch (e) {
                    return throwValue('CONVERTING OBJECT TO PRIMITIVE CAUSES ERROR: ' + e);
                }
            }
            return propertyValue;
        });

        node.property.setValue(propertyValue);
    });

    function toNumber(value:string) {
        const asNumber = +value >> 0;
        if (asNumber + '' === value && asNumber >= 0) {
            return asNumber;
        }
        return null;

    }
};