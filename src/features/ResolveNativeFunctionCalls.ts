import NodeVisitor = require("../NodeVisitor");
import {CallNode, MemberNode, NewNode} from "../SemanticNode";
import {ObjectValue, FUNCTION, Value} from "../Value";
import {createValueFromCall, createValueFromNewCall, isBuiltIn} from "../BuiltIn";
import {hasTrueValue, getTrueValue} from "../Utils";
import Map = require("../Map");

const UNSAFE_FUNCTIONS:Function[] = [
    Object.prototype.toLocaleString,
    Array.prototype.toLocaleString,
    Number.prototype.toLocaleString,
    Math.random,
    Date.prototype.toString,
    Date.prototype.toDateString,
    Date.prototype.toTimeString,
    Date.prototype.toLocaleString,
    Date.prototype.toLocaleDateString,
    Date.prototype.toLocaleTimeString
];

function isUnsafeInSpecialCase(fn:Function, newCall:boolean, parameters:any[]):boolean {
    if (fn === Date) {
        return newCall ? parameters.length === 0 : true;
    }
    return false;
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

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, resolveCall);
    nodeVisitor.on(NewNode, resolveCall);

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
        if (isUnsafeInSpecialCase(fn, node instanceof NewNode, parameters)) {
            return;
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
            if (canMutate(fn, context, parameters)) {
                return;
            }
            resultValue = createValueFromCall(fn, context, parameters);
        } else {
            resultValue = createValueFromNewCall(fn, parameters);
        }
        node.setValue(resultValue);

    }

    function canMutate(fn:Function, context:any, parameters:any[]) {
        if (fn === Function.prototype.apply || fn === Function.prototype.call) {
            fn = context;
            context = parameters[0];
        }
        return MUTATING_METHODS.indexOf(fn) !== -1 && isBuiltIn(context);
    }
};