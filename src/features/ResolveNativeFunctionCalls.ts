import NodeVisitor = require("../NodeVisitor");
import {CallNode, MemberNode} from "../SemanticNode";
import {ObjectValue, FUNCTION} from "../Value";
import {createValueFromCall} from "../BuiltIn";
import {hasTrueValue, getTrueValue} from "../Utils";

const UNSAFE_FUNCTIONS:Function[] = [
    Object.prototype.toLocaleString,
    Array.prototype.toLocaleString,
    Number.prototype.toLocaleString,
    Math.random,
    Date,
    Date.prototype.toString,
    Date.prototype.toDateString,
    Date.prototype.toTimeString,
    Date.prototype.toLocaleString,
    Date.prototype.toLocaleDateString,
    Date.prototype.toLocaleTimeString
];


export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (node:CallNode) => {
        let callee = node.callee;
        let value = callee.getValue();
        if (!(value instanceof ObjectValue) || value.objectClass !== FUNCTION) {
            return;
        }
        if (!value.trueValue || UNSAFE_FUNCTIONS.indexOf(value.trueValue as any) !== -1) {
            return;
        }
        let context = null;
        if (callee instanceof MemberNode) {
            const contextValue = callee.object.getValue();
            if (hasTrueValue(contextValue)) {
                context = getTrueValue(contextValue);
            } else {
                return;
            }
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

        node.setValue(createValueFromCall((value.trueValue as Function), context, parameters));
    });
};