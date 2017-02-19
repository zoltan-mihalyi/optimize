import {KnownValue, SingleValue} from "../Value";
import NodeVisitor = require("../NodeVisitor");
import {ConditionalNode} from "../node/Operators";
import {IfNode} from "../node/Branches";

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
            const unUsedBranch = boolValue.value ? node.alternate : node.consequent;

            const result = unUsedBranch ? unUsedBranch.getDeclarations() : [];
            if (usedBranch) {
                result.push(usedBranch.toAst());
            }
            node.replaceWith(result);
        }
    }
};