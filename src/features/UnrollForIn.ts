import NodeVisitor = require("../NodeVisitor");
import {SingleValue} from "../Value";
import {canWrapObjectValue} from "../Utils";
import recast = require("recast");
import {ForInNode} from "../node/Loops";
import {VariableDeclarationNode} from "../node/Variables";
import {BlockNode} from "../node/Blocks";

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
            const object = node.context.wrapObjectValue(rightValue);

            if (!object.canIterate()) {
                return;
            }

            object.iterate((key:string) => {
                let setLoopVariable:Expression;
                let initialExpression = builders.literal(key);
                if (left instanceof VariableDeclarationNode) {
                    const declarator = left.declarations[0].toAst();
                    (declarator as any).init = initialExpression;
                    setLoopVariable = builders.variableDeclaration(left.kind, [declarator]);
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
                unrolled.unshift(builders.variableDeclaration('var', [left.declarations[0].toAst()]));
            }
        }

        node.replaceWith(unrolled);
    });
};