import NodeVisitor = require("../NodeVisitor");
import {BinaryNode, UnaryNode} from "../SemanticNode";
import {KnownValue, unknown} from "../Value";

export = (nodeVisitor:NodeVisitor) => {

    nodeVisitor.on(BinaryNode, (node:BinaryNode) => {
        const rightValue = node.right.getValue();
        const leftValue = node.left.getValue();
        const evaluator = new Function('left,right', `return left ${node.operator} right;`) as (x, y) => any;
        node.setValue(leftValue.product(rightValue, (leftValue, rightValue) => {
            if (leftValue instanceof KnownValue && rightValue instanceof KnownValue) {
                return new KnownValue(evaluator(leftValue.value, rightValue.value));
            }
            return unknown;
        }));
    });

    nodeVisitor.on(UnaryNode, (node:UnaryNode) => {
        const argument = node.argument;
        const valueInformation = argument.getValue();
        const mapper = new Function('arg', `return ${node.operator} arg;`) as (x) => any;
        node.setValue(valueInformation.map(value => {
            if (value instanceof KnownValue) {
                return new KnownValue(mapper(value.value));
            }
            return unknown;
        }));
    });
};