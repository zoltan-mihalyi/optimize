import {FunctionObjectClass, ReferenceValue, Value} from "../Value";
import {getMutatingObject, getParameters, getRealFunctionAndContext, getTrueValue, hasTrueValue} from "../Utils";
import {CallNode, NewNode} from "../node/CallNodes";
import {MemberNode} from "../node/Others";
import {TrackingVisitor} from "../NodeVisitor";
import {ExpressionNode} from "../node/ExpressionNode";
import {IdentifierNode} from "../node/IdentifierNode";
import EvaluationState = require("../EvaluationState");

const UNSAFE_FUNCTIONS:Function[] = [
    eval,
    Object.prototype.toLocaleString,
    Array.prototype.toLocaleString,
    Number.prototype.toLocaleString,
    Math.random,
    Date.prototype.toString,
    Date.prototype.toDateString,
    Date.prototype.toTimeString,
    Date.prototype.toLocaleString,
    Date.prototype.toLocaleDateString,
    Date.prototype.toLocaleTimeString,
    Function
];

function isUnsafeNewCall(fn:Function, parameters:any[]) {
    if (fn === Date) {
        return parameters.length === 0;
    }
    return false;
}

export  = (visitor:TrackingVisitor) => {
    visitor.on(CallNode, resolveCall);
    visitor.on(NewNode, resolveCall);

    function resolveCall(node:CallNode|NewNode, state:EvaluationState) {
        let callee = node.callee;
        let value = callee.getValue();
        if (!(value instanceof ReferenceValue) || !(value.objectClass instanceof FunctionObjectClass)) {
            return;
        }
        const fn = value.objectClass.native;
        if (!fn || UNSAFE_FUNCTIONS.indexOf(fn) !== -1) {
            return;
        }

        const parameters = getParameters(state, node);
        if (parameters === null) {
            return;
        }

        let resultValue:Value;
        if (node instanceof CallNode) {

            let context = null;
            if (callee instanceof MemberNode) {
                const contextValue = callee.object.getValue();
                if (hasTrueValue(contextValue, state)) {
                    context = getTrueValue(contextValue, state);
                } else {
                    return;
                }
            }
            if (isUnsafeInFunctionCall(fn, context, parameters)) {
                return;
            }
            let mutatingObject = getMutatingObject(fn, context, parameters);
            if (mutatingObject) {
                if (state.scope.isBuiltIn(mutatingObject)) {
                    return;
                }
                if (isMutatingVariable(mutatingObject, context, parameters)) {
                    return;
                }
            }
            resultValue = state.createValueFromCall(fn, context, parameters);
        } else {
            if (isUnsafeNewCall(fn, parameters)) {
                return;
            }
            resultValue = state.createValueFromNewCall(fn, parameters);
        }
        node.setValue(resultValue);


        function isUnsafeInFunctionCall(fn:Function, context:any, parameters:any[]):boolean {
            [fn, context] = getRealFunctionAndContext(fn, context, parameters);

            if (fn === Date) {
                return true;
            } else if (fn === Object.prototype.toString) {
                return context == null;
            } else if (fn === Object.prototype.hasOwnProperty) {
                if (state.scope.isBuiltIn(context)) {
                    return !state.dereference(state.getReferenceValue(context)).hasProperty(parameters[0]); //todo simplify
                } else if (context instanceof RegExp) {
                    return true;
                }
            }
            return false;
        }

        function isMutatingVariable(mutatingObject:any, context:any, parameters:any[]) {
            const mutatingNode = getMutatingNode(mutatingObject, context, parameters);
            return mutatingNode instanceof IdentifierNode;
        }

        function getMutatingNode(mutatingObject:any, context:any, parameters:any[]):ExpressionNode {
            if (mutatingObject === context) {
                return (node.callee as MemberNode).object;
            }
            for (let i = 0; i < parameters.length; i++) {
                if (parameters[i] === mutatingObject) {
                    return node.arguments[i];
                }
            }
        }
    }
};