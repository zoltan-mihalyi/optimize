import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../SemanticNode";
import {SingleValue, KnownValue, ObjectValue} from "../Value";
import {throwValue} from "../Utils";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        if (!node.computed) {
            return;
        }
        let propertyValue = node.property.getValue().map((propertyValue:SingleValue) => {
            if (propertyValue instanceof KnownValue) {
                if (typeof propertyValue.value !== 'string') {
                    return new KnownValue(propertyValue.value + '');
                }
            } else {
                let trueValue = (propertyValue as ObjectValue).trueValue;
                if (trueValue) {
                    try {
                        let string = trueValue + '';
                        return new KnownValue(string);
                    } catch (e) {
                        return throwValue('CONVERTING OBJECT TO PRIMITIVE CAUSES ERROR: ' + e);
                    }
                }
            }
            return propertyValue;
        });

        node.property.setValue(propertyValue);
    });
};