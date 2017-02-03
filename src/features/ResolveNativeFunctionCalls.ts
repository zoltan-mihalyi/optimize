import NodeVisitor = require("../NodeVisitor");
import {CallNode, MemberNode} from "../SemanticNode";
import {ObjectValue, FUNCTION, KnownValue} from "../Value";
import {isPrimitive} from "../Utils";

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

        const parameters:(string|boolean|number)[] = [];
        for (let i = 0; i < node.arguments.length; i++) {
            const argument = node.arguments[i];
            let parameter = argument.getValue();
            if (!(parameter instanceof KnownValue)) {
                return;
            }
            parameters.push(parameter.value);
        }

        let callResult;
        try {
            callResult = (value.trueValue as Function).apply(context, parameters);
        } catch (e) {
            //todo set throwValue
            return;
        }
        if (isPrimitive(callResult)) {
            node.setValue(new KnownValue(callResult));
        }
    });
};