import NodeVisitor = require("../NodeVisitor");
import {ReferenceValue, FUNCTION, Value} from "../Value";
import {hasTrueValue, getTrueValue} from "../Utils";
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

function getRealFunctionAndContext(fn:Function, context:any, parameters:any[]):[Function, any] {
    if (fn === Function.prototype.apply || fn === Function.prototype.call) {
        return [context, parameters[0]];
    }
    return [fn, context];
}

const MUTATING_METHODS:Function[] = [
    Array.prototype.pop,
    Array.prototype.push,
    Array.prototype.reverse,
    Array.prototype.sort,
    Array.prototype.shift,
    Array.prototype.unshift,
    Array.prototype.splice
];

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

        const parameters = [];
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            let parameter = argument.getValue();
            if (hasTrueValue(parameter, state)) {
                parameters.push(getTrueValue(parameter, state));
            } else {
                return;
            }
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
            if (canMutate(fn, context, parameters)) {
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

        function canMutate(fn:Function, context:any, parameters:any[]) {
            [fn, context] = getRealFunctionAndContext(fn, context, parameters);
            return MUTATING_METHODS.indexOf(fn) !== -1 && state.isBuiltIn(context);
        }
    }
};