import {ExpressionNode} from "./ExpressionNode";
import {Value, PropDescriptorMap, OBJECT, PrimitiveValue, HeapObject, KNOWS_ALL, MAY_HAVE_NEW} from "../tracking/Value";
import {hasTrueValue, getTrueValue, throwValue} from "../utils/Utils";
import {SemanticNode} from "./SemanticNode";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {IdentifierNode} from "./IdentifierNode";
import EvaluationState = require("../tracking/EvaluationState");
import Later = require("./Later");

export class ObjectNode extends ExpressionNode {
    properties:PropertyNode[];

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        for (let i = 0; i < this.properties.length; i++) {
            const obj = this.properties[i];
            obj.track(state, visitor);
        }

        if (!this.isClean()) {
            return;
        }
        let properties:PropDescriptorMap = {};
        let knowsAll = true;
        let trueValue:{ [idx:string]:any } = {};
        for (let i = 0; i < this.properties.length; i++) {
            const property = this.properties[i];
            let value = property.getKeyValue();
            if (hasTrueValue(value, state)) {
                const propertyValue = property.value.getValue();
                let key;
                try {
                    key = '' + getTrueValue(value, state);
                } catch (e) {
                    return throwValue('CANNOT RESOLVE DYNAMIC PROPERTY' + e);
                }
                properties[key] = {
                    enumerable: true,
                    writable: true,
                    value: propertyValue
                };
                if (trueValue && hasTrueValue(propertyValue, state)) {
                    trueValue[key] = getTrueValue(propertyValue, state);
                } else {
                    trueValue = null;
                }
            } else {
                properties = {};
                knowsAll = false;
                trueValue = null;
                break;
            }
        }
        this.setValue(state.createObject(OBJECT, new HeapObject({
            proto: state.getReferenceValue(Object.prototype),
            properties: properties,
            propertyInfo: knowsAll ? KNOWS_ALL : MAY_HAVE_NEW,
            trueValue: trueValue
        })));
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.properties.length; i++) {
            const property = this.properties[i];
            if (property.computed && !property.key.isClean()) {
                return false;
            }
            if (!property.value.isClean()) {
                return false;
            }
        }
        return true;
    }
}

export class PropertyNode extends SemanticNode {
    computed:boolean;
    key:ExpressionNode;
    kind:'init';
    method:boolean;
    shorthand:boolean;
    value:ExpressionNode;

    onTrack(state:EvaluationState, visitor:TrackingVisitor) {
        if (this.computed || !(this.key instanceof IdentifierNode)) {
            this.key.track(state, visitor);
        }
        this.value.track(state, visitor);
    }

    getKeyValue():Value {
        if (this.computed) {
            return this.key.getValue();
        }
        if (this.key instanceof Later.IdentifierNode) {
            return new PrimitiveValue(this.key.name);
        } else {
            return this.key.getValue();
        }
    }
}
Later.PropertyNode = PropertyNode;