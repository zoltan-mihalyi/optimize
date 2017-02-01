import {KnownValue, SingleValue} from "../Value";
import {IfNode, ConditionalNode} from "../SemanticNode";
import NodeVisitor = require("../NodeVisitor");

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(IfNode, reduceConditional);
    nodeVisitor.on(ConditionalNode, reduceConditional);

    function reduceConditional(node:IfNode|ConditionalNode) {
        const value = node.test.getValue();
        const boolValue = value.map((value:SingleValue) => {
            if (value instanceof KnownValue) {
                return new KnownValue(!!value.value);
            } else { //ObjectValue
                return new KnownValue(true);
            }
        });
        if (boolValue instanceof KnownValue) {
            const usedBranch = boolValue.value ? node.consequent : node.alternate;
            if (usedBranch) {
                node.replaceWith([usedBranch.toAst()]);
            } else {
                node.remove();
            }
        }
    }
};