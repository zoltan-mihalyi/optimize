import {PrimitiveValue} from "../Value";
import {LogicalNode} from "../node/Operators";
import {NodeVisitor} from "../NodeVisitor";

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(LogicalNode, (node:LogicalNode) => {
        const leftValue = node.left.getValue();

        const leftAsBoolean = leftValue.map(value => {
            if (value instanceof PrimitiveValue) {
                return new PrimitiveValue(!!value.value);
            } else {
                return new PrimitiveValue(true);
            }
        });
        if (leftAsBoolean instanceof PrimitiveValue) {
            let useLeft = leftAsBoolean.value;
            if (node.operator === '&&') {
                useLeft = !useLeft;
            }
            node.replaceWith([(useLeft ? node.left : node.right).toAst()]);
        }

    });
};