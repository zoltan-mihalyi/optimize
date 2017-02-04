import NodeVisitor = require("../NodeVisitor");
import {CallNode, MemberNode} from "../SemanticNode";
import {ObjectValue, FUNCTION, KnownValue} from "../Value";
import {createValue} from "../BuiltIn";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(CallNode, (node:CallNode) => {
        let callee = node.callee;
        let value = callee.getValue();
        if (!(value instanceof ObjectValue) || value.objectClass !== FUNCTION) {
            return;
        }
        if (!value.trueValue) {
            return;
        }
        let context = null;
        if (callee instanceof MemberNode) {
            const contextValue = callee.object.getValue();
            if (contextValue instanceof KnownValue) {
                context = contextValue.value;
            } else if (contextValue instanceof ObjectValue && contextValue.trueValue) {
                context = contextValue.trueValue;
            } else {
                return;
            }
        }

        const parameters = [];
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            let parameter = argument.getValue();
            if (parameter instanceof KnownValue) {
                parameters.push(parameter.value);
            } else {
                let trueValue = (parameter as ObjectValue).trueValue;
                if (trueValue) {
                    parameters.push(trueValue);
                } else {
                    return;
                }
            }
        }

        let callResult;
        try {
            callResult = (value.trueValue as Function).apply(context, parameters);
        } catch (e) {
            //todo set throwValue
            return;
        }
        node.setValue(createValue(callResult));
    });
};