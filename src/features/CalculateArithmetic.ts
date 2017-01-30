import NodeVisitor = require("../NodeVisitor");
import {BinaryNode, UnaryNode} from "../SemanticNode";
import {KnownValue, unknown, ObjectValue, ComparisonResult} from "../Value";

export = (nodeVisitor:NodeVisitor) => {

    nodeVisitor.on(BinaryNode, (node:BinaryNode) => {
        const rightValue = node.right.getValue();
        const leftValue = node.left.getValue();
        const evaluator = new Function('left,right', `return left ${node.operator} right;`) as (x, y) => any;
        node.setValue(leftValue.product(rightValue, (leftValue, rightValue) => {
            if (isStrictEqual() || isEqual()) {
                const comparisionResult = leftValue.compareTo(rightValue, isStrictEqual());
                if (comparisionResult === ComparisonResult.TRUE) {
                    return maybeNegated(true);
                } else if (comparisionResult === ComparisonResult.FALSE) {
                    return maybeNegated(false);
                }
            }

            if (leftValue instanceof KnownValue && rightValue instanceof KnownValue) {
                return new KnownValue(evaluator(leftValue.value, rightValue.value));
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
        const mapper = new Function('arg', `return ${node.operator} arg;`) as (x) => any;
        node.setValue(valueInformation.map(value => {
            if (value instanceof KnownValue) {
                return new KnownValue(mapper(value.value));
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