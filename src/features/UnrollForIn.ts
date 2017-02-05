import NodeVisitor = require("../NodeVisitor");
import {ForInNode, VariableDeclarationNode, BlockNode} from "../SemanticNode";
import {SingleValue} from "../Value";
import {canWrapObjectValue, wrapObjectValue} from "../BuiltIn";
import recast = require("recast");

const builders = recast.types.builders;

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(ForInNode, (node:ForInNode) => {
        const rightValue = node.right.getValue();
        const body = node.body;

        //todo use with map, different objects can have the same properties!
        if (!(rightValue instanceof SingleValue)) {
            return;
        }

        let left = node.left;
        const unrolled:Expression[] = [];

        if (canWrapObjectValue(rightValue)) {
            const object = wrapObjectValue(rightValue);

            if (!object.canIterate()) {
                return;
            }

            object.iterate((key:string) => {
                let setLoopVariable:Expression;
                let initialExpression = builders.literal(key);
                if (left instanceof VariableDeclarationNode) {
                    setLoopVariable = left.toAst();
                    (setLoopVariable as any).declarations[0].init = initialExpression;
                } else {
                    let assignment = builders.assignmentExpression('=', left.toAst(), initialExpression);
                    setLoopVariable = builders.expressionStatement(assignment);
                }
                let newBody = body.toAst();
                if (!(body instanceof BlockNode)) {
                    newBody = builders.blockStatement([newBody]);
                }
                (newBody as any).body.unshift(setLoopVariable);
                unrolled.push(newBody);
            });
        }

        if (unrolled.length === 0) {
            let declarations = body.getDeclarations();
            unrolled.unshift(...declarations);
            if (left instanceof VariableDeclarationNode && !left.isBlockScoped()) {
                unrolled.unshift(left.toAst());
            }
        }

        node.replaceWith(unrolled);
    });
};