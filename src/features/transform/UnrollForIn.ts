import {SingleValue} from "../../tracking/Value";
import {canWrap} from "../../utils/Utils";
import {ForInNode} from "../../node/Loops";
import {VariableDeclarationNode} from "../../node/Variables";
import {BlockNode} from "../../node/Blocks";
import {TrackingVisitor} from "../../utils/NodeVisitor";
import recast = require("recast");
import EvaluationState = require("../../tracking/EvaluationState");

const builders = recast.types.builders;

export  = (visitor:TrackingVisitor) => {
    visitor.on(ForInNode, (node:ForInNode, state:EvaluationState) => {
        const rightValue = node.right.getValue();
        const body = node.body;

        //todo use with map, different objects can have the same properties!
        if (!(rightValue instanceof SingleValue)) {
            return;
        }

        let left = node.left;
        const unrolled:Expression[] = [];

        if (canWrap(rightValue)) {
            const ref = state.wrapReferenceValue(rightValue);
            const object = state.dereference(ref);

            if (!object.canIterate(state)) {
                return;
            }

            object.iterate(state, (key:string) => {
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