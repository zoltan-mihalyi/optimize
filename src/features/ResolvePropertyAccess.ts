import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../Nodes";
import {SingleValue, KnownValue, unknown} from "../Value";
import {throwValue, canWrapObjectValue} from "../Utils";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        const resolved = node.object.getValue().product(node.getPropertyValue(), (left:SingleValue, property:SingleValue) => {
            if (!(property instanceof KnownValue)) {
                return unknown;
            }

            if (canWrapObjectValue(left)) {
                let object = node.context.wrapObjectValue(left);
                return object.resolveProperty('' + property.value, (fn:Function) => {
                    return node.context.createValueFromCall(fn, object.trueValue, []);
                });
            } else {
                return throwValue(`ACCESSING PROPERTY ${property.value} ON ${(left as KnownValue).value}`);
            }
        });

        node.setValue(resolved);
    });
};