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
    BOOLEAN,
    PropInfo,
    Value
} from "../Value";
import {NumberProto, BooleanProto, StringProto, createValueFromCall} from "../BuiltIn";

export  = (nodeVisitor:NodeVisitor) => {
    nodeVisitor.on(MemberNode, (node:MemberNode) => {
        const resolved = node.object.getValue().product(node.getPropertyValue(), (left:SingleValue, property:SingleValue) => {
            if (!(property instanceof KnownValue)) {
                return unknown;
            }
            let object:ObjectValue;
            if (left instanceof KnownValue) {
                if (typeof left.value === 'number') {
                    //noinspection JSPrimitiveTypeWrapperUsage
                    object = new ObjectValue(NUMBER, {
                        proto: NumberProto,
                        properties: {},
                        propertyInfo: PropInfo.KNOWS_ALL,
                        trueValue: new Number(left.value)
                    });
                } else if (typeof left.value === 'boolean') {
                    //noinspection JSPrimitiveTypeWrapperUsage
                    object = new ObjectValue(BOOLEAN, {
                        proto: BooleanProto,
                        properties: {},
                        propertyInfo: PropInfo.KNOWS_ALL,
                        trueValue: new Boolean(left.value)
                    });
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

                    //noinspection JSPrimitiveTypeWrapperUsage
                    object = new ObjectValue(STRING, {
                        proto: StringProto,
                        properties: properties,
                        propertyInfo: PropInfo.KNOWS_ALL,
                        trueValue: new String(left.value)
                    });
                } else {
                    return unknown;
                }
            } else {
                object = left as ObjectValue;
            }

            function getterEvaluator(fn:Function):Value {
                return createValueFromCall(fn, object.trueValue, []);
            }

            return object.resolveProperty('' + property.value, getterEvaluator);
        });

        node.setValue(resolved);
    });
};