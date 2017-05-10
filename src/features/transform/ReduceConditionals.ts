import {PrimitiveValue, SingleValue} from "../../tracking/Value";
import {ConditionalNode} from "../../node/Operators";
import {IfNode} from "../../node/Branches";
import {NodeVisitor} from "../../utils/NodeVisitor";

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(IfNode, reduceConditional);
    nodeVisitor.on(ConditionalNode, reduceConditional);

    function reduceConditional(node:IfNode|ConditionalNode) {
        const value = node.test.getValue();
        const boolValue = value.map((value:SingleValue) => {
            if (value instanceof PrimitiveValue) {
                return new PrimitiveValue(!!value.value);
            } else { //ReferenceValue
                return new PrimitiveValue(true);
            }
        });
        if (boolValue instanceof PrimitiveValue) {
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