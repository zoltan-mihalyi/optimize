import NodeVisitor = require("../NodeVisitor");
import {BinaryNode, UnaryNode} from "../SemanticNode";
import {KnownValue, unknown, ObjectValue, ComparisonResult} from "../Value";
import {hasTrueValue, getTrueValue} from "../Utils";
import {createValue} from "../BuiltIn";

export = (nodeVisitor:NodeVisitor) => {

    nodeVisitor.on(BinaryNode, (node:BinaryNode) => {
        const rightValue = node.right.getValue();
        const leftValue = node.left.getValue();
        const evaluator = new Function('left,right', `return left ${node.operator} right;`) as (x:any, y:any) => any;
        node.setValue(leftValue.product(rightValue, (leftValue, rightValue) => {
            if (isStrictEqual() || isEqual()) {
                const comparisionResult = leftValue.compareTo(rightValue, isStrictEqual()); //todo compare to does not belong to value class
                if (comparisionResult === ComparisonResult.TRUE) {
                    return maybeNegated(true);
                } else if (comparisionResult === ComparisonResult.FALSE) {
                    return maybeNegated(false);
                }
            }

            if (hasTrueValue(leftValue) && hasTrueValue(rightValue)) {
                return createValue(evaluator(getTrueValue(leftValue), getTrueValue(rightValue)));
            }
            return unknown;
        }));

        function isStrictEqual():boolean {
            return node.operator === '===' || node.operator === '!==';
        }

        function isEqual():boolean {
            return node.operator === '==' || node.operator === '!=';
        }

        function maybeNegated(value:boolean):KnownValue {
            return new KnownValue(value === (node.operator[0] === '='));
        }
    });

    nodeVisitor.on(UnaryNode, (node:UnaryNode) => {
        const argument = node.argument;
        const valueInformation = argument.getValue();
        const mapper = new Function('arg', `return ${node.operator} arg;`) as (x:any) => any;
        node.setValue(valueInformation.map(value => {
            if (hasTrueValue(value)) {
                return createValue(mapper(getTrueValue(value)));
            } else if (value instanceof ObjectValue) {
                if (node.operator === '!') {
                    return new KnownValue(false);
                } else if (node.operator === 'void') {
                    return new KnownValue(void 0);
                } else if (node.operator === 'typeof') {
                    return new KnownValue(value.objectClass.getTypeof());
                }
            }
            return unknown;
        }));
    });
};