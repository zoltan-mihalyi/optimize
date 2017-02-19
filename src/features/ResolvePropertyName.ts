import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../Nodes";
import {SingleValue, KnownValue} from "../Value";
import {throwValue, hasTrueValue, getTrueValue} from "../Utils";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        if (!node.computed) {
            return;
        }
        let propertyValue = node.property.getValue().map((propertyValue:SingleValue) => {
            if (hasTrueValue(propertyValue)) {
                try {
                    let string = getTrueValue(propertyValue) + '';
                    let number = toNumber(string);
                    return new KnownValue(number === null ? string : number);
                } catch (e) {
                    return throwValue('CONVERTING OBJECT TO PRIMITIVE CAUSES ERROR: ' + e);
                }
            }
            return propertyValue;
        });

        node.property.setValue(propertyValue);
    });

    function toNumber(value:string) {
        const asNumber = +value >> 0;
        if (asNumber + '' === value && asNumber >= 0) {
            return asNumber;
        }
        return null;

    }
};