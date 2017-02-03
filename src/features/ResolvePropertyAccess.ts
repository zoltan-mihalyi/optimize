import NodeVisitor = require("../NodeVisitor");
import {MemberNode} from "../SemanticNode";
import {
    SingleValue,
    KnownValue,
    unknown,
    ObjectValue,
    NUMBER,
    STRING,
    PropDescriptorMap,
    BOOLEAN
} from "../Value";
import {NumberProto, BooleanProto, StringProto} from "../BuiltIn";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        const resolved = node.object.getValue().product(node.getPropertyValue(), (left:SingleValue, property:SingleValue) => {
            if (!(property instanceof KnownValue)) {
                return unknown;
            }
            let object:ObjectValue;
            if (left instanceof KnownValue) {
                if (typeof left.value === 'number') {
                    object = new ObjectValue(NUMBER, NumberProto, {}, true);
                } else if (typeof left.value === 'boolean') {
                    object = new ObjectValue(BOOLEAN, BooleanProto, {}, true);
                } else if (typeof left.value === 'string') {
                    const properties:PropDescriptorMap = {
                        length: {
                            enumerable: false,
                            value: new KnownValue(left.value.length)
                        }
                    };
                    for (var i = 0; i < left.value.length; i++) {
                        properties['' + i] = {
                            enumerable: true,
                            value: new KnownValue(left.value[i])
                        };
                    }

                    object = new ObjectValue(STRING, StringProto, properties, true);
                } else {
                    return unknown;
                }
            } else {
                object = left as ObjectValue;
            }

            return object.resolveProperty('' + property.value);
        });

        node.setValue(resolved);
    });
};