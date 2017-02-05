import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../SemanticNode";
import {SingleValue, KnownValue, unknown} from "../Value";
import {createValueFromCall, canWrapObjectValue, wrapObjectValue} from "../BuiltIn";
import {throwValue} from "../Utils";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        const resolved = node.object.getValue().product(node.getPropertyValue(), (left:SingleValue, property:SingleValue) => {
            if (!(property instanceof KnownValue)) {
                return unknown;
            }

            if (canWrapObjectValue(left)) {
                let object = wrapObjectValue(left);
                return object.resolveProperty('' + property.value, (fn:Function) => {
                    return createValueFromCall(fn, object.trueValue, []);
                });
            } else {
                return throwValue(`ACCESSING PROPERTY ${property.value} ON ${(left as KnownValue).value}`);
            }
        });

        node.setValue(resolved);
    });
};