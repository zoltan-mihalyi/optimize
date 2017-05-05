import {TrackingVisitor} from "../NodeVisitor";
import {NewNode} from "../node/CallNodes";
import {PrimitiveValue, ReferenceValue} from "../Value";
import EvaluationState = require("../EvaluationState");
import recast = require("recast");

const builders = recast.types.builders;

export = (trackingVisitor:TrackingVisitor) => {
    trackingVisitor.on(NewNode, (node:NewNode, state:EvaluationState) => {
        const calleeValue = node.callee.getValue();
        if (!(calleeValue instanceof ReferenceValue)) {
            return;
        }

        if (calleeValue === state.getReferenceValue(Array)) {
            if (node.arguments.length === 1) { //create array with initial size
                return;
            }
            node.replaceWith([builders.arrayExpression(node.arguments.map(arg => arg.toAst()))]);
        } else if (calleeValue === state.getReferenceValue(RegExp)) {
            const nodeValue = node.getValue();

            if (nodeValue instanceof ReferenceValue) {
                node.replaceWith([builders.literal(state.dereference(nodeValue).trueValue)]);
            }
        } else if (calleeValue === state.getReferenceValue(Object)) {
            const paramValue = node.arguments.length > 0 ? node.arguments[0].getValue() : new PrimitiveValue(void 0);
            for (let i = 1; i < node.arguments.length; i++) {
                if (!node.arguments[i].isClean()) {
                    return;
                }
            }
            const paramNull = paramValue.map(param => {
                return new PrimitiveValue(param instanceof PrimitiveValue && param.value == null);
            });
            if (paramNull instanceof PrimitiveValue && paramNull.value) {
                node.replaceWith([builders.objectExpression([])]);
                return;
            }

            const paramReference = paramValue.map(param => {
                return new PrimitiveValue(param instanceof ReferenceValue);
            });
            if (paramReference instanceof PrimitiveValue && paramReference.value) {
                node.replaceWith([node.arguments[0].toAst()]);
            }
        }
    });
};