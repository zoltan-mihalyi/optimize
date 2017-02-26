import {SingleValue, PrimitiveValue, unknown} from "../Value";
import {throwValue, canWrap} from "../Utils";
import {MemberNode} from "../node/Others";
import {TrackingVisitor} from "../NodeVisitor";
import EvaluationState = require("../EvaluationState");

export  = (trackingVisitor:TrackingVisitor) => {
    trackingVisitor.on(MemberNode, (node:MemberNode, state:EvaluationState) => {
        if (!node.isReadOnly()) {
            return;
        }
        const resolved = node.object.getValue().product(node.getPropertyValue(), (left:SingleValue, property:SingleValue) => {
            if (!(property instanceof PrimitiveValue)) {
                return unknown;
            }

            if (canWrap(left)) {
                const reference = state.wrapReferenceValue(left);
                const object = state.dereference(reference);
                return object.resolveProperty(state, '' + property.value, object.trueValue); //todo no trueValue?
            } else {
                return throwValue(`ACCESSING PROPERTY ${property.value} ON ${(left as PrimitiveValue).value}`);
            }
        });

        node.setValue(resolved);
    });
};