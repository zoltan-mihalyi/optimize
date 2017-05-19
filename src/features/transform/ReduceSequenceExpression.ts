import recast = require("recast");
import {SequenceNode} from "../../node/Others";
import {NodeVisitor} from "../../utils/NodeVisitor";

const builders = recast.types.builders;

export = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(SequenceNode, (node:SequenceNode) => {
        const nodes = [];
        for (let i = 0; i < node.expressions.length; i++) {
            const expression = node.expressions[i];
            if (!expression.isClean() || i === node.expressions.length - 1) {
                nodes.push(expression);
            }
        }
        if (nodes.length < node.expressions.length) {
            const expressions = [];
            for (let i = 0; i < nodes.length; i++) {
                expressions.push(nodes[i].toAst());
            }
            let result = expressions.length === 1 ? expressions[0] : builders.sequenceExpression(expressions);
            node.replaceWith([result]);
        }
    });
};