import NodeVisitor = require("../NodeVisitor");
import {ReferenceValue, FUNCTION, Value} from "../Value";
import {hasTrueValue, getTrueValue, getRealFunctionAndContext, getParameters, getMutatingObject} from "../Utils";
import {NewNode, CallNode} from "../node/CallNodes";
import {MemberNode} from "../node/Others";
import {TrackingVisitor} from "../NodeVisitor";
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
        if (!(value instanceof ReferenceValue) || state.dereference(value).objectClass !== FUNCTION) {
            return;
        }
        const fn = state.dereference(value).trueValue as Function;
        if (!fn || UNSAFE_FUNCTIONS.indexOf(fn as any) !== -1) {
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
            if (getMutatingObject(fn, context, parameters)) {
                return;
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
                if (state.isBuiltIn(context)) {
                    return !state.dereference(state.getReferenceValue(context)).hasProperty(parameters[0]); //todo simplify
                } else if (context instanceof RegExp) {
                    return true;
                }
            }
            return false;
        }
    }
};