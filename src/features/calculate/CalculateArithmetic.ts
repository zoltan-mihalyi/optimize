import {PrimitiveValue, unknown, ReferenceValue, SingleValue, FunctionObjectClass} from "../../tracking/Value";
import { binaryCache, throwValue} from "../../utils/Utils";
import {BinaryNode, UnaryNode} from "../../node/Operators";
import {TrackingVisitor} from "../../utils/NodeVisitor";
import Cache = require("../../utils/Cache");
import EvaluationState = require("../../tracking/EvaluationState");


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
            if (node.operator === 'in') {
                if (rightValue instanceof ReferenceValue) {
                    const trueValue = state.getTrueValue(leftValue);
                    if (!trueValue) {
                        return unknown;
                    }
                    if (state.dereference(rightValue).hasPropertyDeep(state, trueValue.value + '')) {
                        return new PrimitiveValue(true);
                    } else {
                        return unknown;
                    }
                } else {
                    return throwValue('USING in OPERATOR WITH PRIMITIVE');
                }
            }
            if (node.operator === 'instanceof') {
                if (rightValue instanceof ReferenceValue) {
                    if (!(rightValue.objectClass instanceof FunctionObjectClass)) {
                        return unknown; //not throwValue, because Function subclasses return false in some environments.
                    }
                    if (leftValue instanceof ReferenceValue) {
                        const isInstance = state.dereference(leftValue).isInstanceOf(state.dereference(rightValue), state);
                        if (isInstance === null) {
                            return unknown;
                        }
                        return new PrimitiveValue(isInstance);
                    } else {
                        return new PrimitiveValue(false);
                    }
                } else {
                    return throwValue('USING instanceof WITH PRIMITIVE');
                }
            }
            const leftTrueValue = state.getTrueValue(leftValue);
            const rightTrueValue = state.getTrueValue(rightValue);
            if (leftTrueValue && rightTrueValue) {
                if ((leftValue instanceof ReferenceValue || rightValue instanceof ReferenceValue)) {
                    if (!node.context.options.assumptions.noNativeOverwrites) {
                        return unknown;
                    }
                }
                return state.createValue(evaluator(leftTrueValue.value, rightTrueValue.value));
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
            const trueValue = state.getTrueValue(value);
            if (trueValue) {
                if (value instanceof PrimitiveValue || node.context.options.assumptions.noNativeOverwrites) {
                    return state.createValue(mapper(trueValue.value));
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