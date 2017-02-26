import NodeVisitor = require("../NodeVisitor");
import {PrimitiveValue, unknown, ReferenceValue, ComparisonResult} from "../Value";
import {hasTrueValue, getTrueValue, binaryCache} from "../Utils";
import {BinaryNode, UnaryNode} from "../node/Operators";
import {TrackingVisitor} from "../NodeVisitor";
import Cache = require("../Cache");
import EvaluationState = require("../EvaluationState");


type UnaryFunction = (x:any) => any;

const unaryCache = new Cache<string, UnaryFunction>(operator => {
    return new Function('arg', `return ${operator} arg;`) as UnaryFunction;
});

export = (trackingVisitor:TrackingVisitor) => {

    trackingVisitor.on(BinaryNode, (node:BinaryNode, state:EvaluationState) => {
        const rightValue = node.right.getValue();
        const leftValue = node.left.getValue();
        const evaluator = binaryCache.get(node.operator);
        node.setValue(leftValue.product(rightValue, (leftValue, rightValue) => {
            if (isStrictEqual() || isEqual()) {
                const comparisionResult = leftValue.compareTo(state, rightValue, isStrictEqual()); //todo compare to does not belong to value class
                if (comparisionResult === ComparisonResult.TRUE) {
                    return maybeNegated(true);
                } else if (comparisionResult === ComparisonResult.FALSE) {
                    return maybeNegated(false);
                }
            }

            if (hasTrueValue(leftValue, state) && hasTrueValue(rightValue, state)) {
                return state.createValue(evaluator(getTrueValue(leftValue, state), getTrueValue(rightValue, state)));
            }
            return unknown;
        }));

        function isStrictEqual():boolean {
            return node.operator === '===' || node.operator === '!==';
        }

        function isEqual():boolean {
            return node.operator === '==' || node.operator === '!=';
        }

        function maybeNegated(value:boolean):PrimitiveValue {
            return new PrimitiveValue(value === (node.operator[0] === '='));
        }
    });

    trackingVisitor.on(UnaryNode, (node:UnaryNode, state:EvaluationState) => {
        const argument = node.argument;
        const valueInformation = argument.getValue();
        const mapper = unaryCache.get(node.operator);
        node.setValue(valueInformation.map(value => {
            if (hasTrueValue(value, state)) {
                return state.createValue(mapper(getTrueValue(value, state)));
            } else {
                if (node.operator === '!') {
                    return new PrimitiveValue(false);
                } else if (node.operator === 'void') {
                    return new PrimitiveValue(void 0);
                } else if (node.operator === 'typeof') {
                    return new PrimitiveValue(state.dereference(value as ReferenceValue).objectClass.getTypeof());
                }
            }
            return unknown;
        }));
    });
};