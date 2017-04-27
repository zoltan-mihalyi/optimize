import {PrimitiveValue, unknown, ReferenceValue, SingleValue} from "../Value";
import {hasTrueValue, getTrueValue, binaryCache} from "../Utils";
import {BinaryNode, UnaryNode} from "../node/Operators";
import {TrackingVisitor} from "../NodeVisitor";
import Cache = require("../Cache");
import EvaluationState = require("../EvaluationState");


type UnaryFunction = (x:any) => any;

const enum ComparisonResult {
    TRUE,
    FALSE,
    UNKNOWN
}

const unaryCache = new Cache<string, UnaryFunction>(operator => {
    return new Function('arg', `return ${operator} arg;`) as UnaryFunction;
});

function compareTo(state:EvaluationState, value1:SingleValue, value2:SingleValue, strict:boolean):ComparisonResult {
    if (value1 instanceof PrimitiveValue) {
        if (value2 instanceof PrimitiveValue) {
            // tslint:disable-next-line:triple-equals
            let equals = strict ? (value1.value === value2.value) : (value1.value == value2.value);
            return fromBoolean(equals);
        } else {
            return compareReferenceToPrimitive(value2 as ReferenceValue, value1);
        }
    } else {
        if (value2 instanceof ReferenceValue) {
            return fromBoolean(value1 === value2);
        } else {
            return compareReferenceToPrimitive(value1 as ReferenceValue, value2 as PrimitiveValue);
        }
    }

    function compareReferenceToPrimitive(reference:ReferenceValue, primitive:PrimitiveValue):ComparisonResult {
        if (strict) {
            return ComparisonResult.FALSE;
        }
        let heapObject = state.dereference(reference);
        if (heapObject.trueValue) {
            // tslint:disable-next-line:triple-equals
            return fromBoolean(heapObject.trueValue == primitive.value);
        }
        return ComparisonResult.UNKNOWN;
    }
}

function fromBoolean(bool:boolean):ComparisonResult {
    return bool ? ComparisonResult.TRUE : ComparisonResult.FALSE;
}

export = (trackingVisitor:TrackingVisitor) => {

    trackingVisitor.on(BinaryNode, (node:BinaryNode, state:EvaluationState) => {
        const rightValue = node.right.getValue();
        const leftValue = node.left.getValue();
        const evaluator = binaryCache.get(node.operator);
        node.setValue(leftValue.product(rightValue, (leftValue, rightValue) => {
            if (isStrictEqual() || isEqual()) {
                const comparisionResult = compareTo(state, leftValue, rightValue, isStrictEqual());
                if (comparisionResult === ComparisonResult.TRUE) {
                    return maybeNegated(true);
                } else if (comparisionResult === ComparisonResult.FALSE) {
                    return maybeNegated(false);
                }
            }

            if (hasTrueValue(leftValue, state) && hasTrueValue(rightValue, state)) {
                if ((leftValue instanceof ReferenceValue || rightValue instanceof ReferenceValue)) {
                    if (!node.context.options.assumptions.noNativeOverwrites) {
                        return unknown;
                    }
                }
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
                if (value instanceof PrimitiveValue || node.context.options.assumptions.noNativeOverwrites) {
                    return state.createValue(mapper(getTrueValue(value, state)));
                }
            }
            if (node.operator === '!') {
                return new PrimitiveValue(false);
            } else if (node.operator === 'void') {
                return new PrimitiveValue(void 0);
            } else if (node.operator === 'typeof') {
                return new PrimitiveValue((value as ReferenceValue).objectClass.getTypeof());
            }
            return unknown;
        }));
    });
};