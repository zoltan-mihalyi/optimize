import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../SemanticNode";
import {SingleValue, KnownValue, ObjectValue} from "../Value";
import {throwValue, hasTrueValue, getTrueValue} from "../Utils";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        if (!node.computed) {
            return;
        }
        let propertyValue = node.property.getValue().map((propertyValue:SingleValue) => {
            if(hasTrueValue(propertyValue)){
                try {
                    let string = getTrueValue(propertyValue) + '';
                    return new KnownValue(string);
                } catch (e) {
                    return throwValue('CONVERTING OBJECT TO PRIMITIVE CAUSES ERROR: ' + e);
                }
            }
            return propertyValue;
        });

        node.property.setValue(propertyValue);
    });
};