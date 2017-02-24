import {ObjectValue, FUNCTION, Value} from "../Value";
import {hasTrueValue, getTrueValue} from "../Utils";
import {NewNode, CallNode} from "../node/CallNodes";
import {MemberNode} from "../node/Others";
import {NodeVisitor, TrackingVisitor} from "../NodeVisitor";

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

    function resolveCall(node:CallNode|NewNode) {
        let callee = node.callee;
        let value = callee.getValue();
        if (!(value instanceof ObjectValue) || value.objectClass !== FUNCTION) {
            return;
        }
        const fn = value.trueValue as Function;
        if (!fn || UNSAFE_FUNCTIONS.indexOf(fn as any) !== -1) {
            return;
        }

        const parameters = [];
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            let parameter = argument.getValue();
            if (hasTrueValue(parameter)) {
                parameters.push(getTrueValue(parameter));
            } else {
                return;
            }
        }

        let resultValue:Value;
        if (node instanceof CallNode) {

            let context = null;
            if (callee instanceof MemberNode) {
                const contextValue = callee.object.getValue();
                if (hasTrueValue(contextValue)) {
                    context = getTrueValue(contextValue);
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
            resultValue = node.context.createValueFromCall(fn, context, parameters);
        } else {
            if (isUnsafeNewCall(fn, parameters)) {
                return;
            }
            resultValue = node.context.createValueFromNewCall(fn, parameters);
        }
        node.setValue(resultValue);


        function isUnsafeInFunctionCall(fn:Function, context:any, parameters:any[]):boolean {
            [fn, context] = getRealFunctionAndContext(fn, context, parameters);

            if (fn === Date) {
                return true;
            } else if (fn === Object.prototype.toString) {
                return context == null;
            } else if (fn === Object.prototype.hasOwnProperty) {
                if (node.context.isBuiltIn(context)) {
                    return !node.context.getObjectValue(context).hasProperty(parameters[0]);
                } else if (context instanceof RegExp) {
                    return true;
                }
            }
            return false;
        }

        function canMutate(fn:Function, context:any, parameters:any[]) {
            [fn, context] = getRealFunctionAndContext(fn, context, parameters);
            return MUTATING_METHODS.indexOf(fn) !== -1 && node.context.isBuiltIn(context);
        }
    }
};