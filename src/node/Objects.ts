import {ExpressionNode} from "./ExpressionNode";
import {Value, PropDescriptorMap, ObjectValue, OBJECT, PropInfo, KnownValue} from "../Value";
import {hasTrueValue, getTrueValue, throwValue} from "../Utils";
import {SemanticNode} from "./SemanticNode";
import EvaluationState = require("../EvaluationState");
import Later = require("./Later");

export class ObjectNode extends ExpressionNode {
    properties:PropertyNode[];

    track(state:EvaluationState) {
        for (let i = 0; i < this.properties.length; i++) {
            const obj = this.properties[i];
            obj.track(state);
        }
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

    protected getInitialValue():Value {
        let properties:PropDescriptorMap = {};
        let knowsAll = true;
        let trueValue:{[idx:string]:any} = {};
        for (let i = 0; i < this.properties.length; i++) {
            const property = this.properties[i];
            let value = property.getKeyValue();
            if (hasTrueValue(value)) {
                const propertyValue = property.value.getValue();
                let key;
                try {
                    key = '' + getTrueValue(value);
                } catch (e) {
                    return throwValue('CANNOT RESOLVE DYNAMIC PROPERTY' + e);
                }
                properties[key] = {
                    enumerable: true,
                    value: propertyValue
                };
                if (trueValue && hasTrueValue(propertyValue)) {
                    trueValue[key] = getTrueValue(propertyValue);
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
        return new ObjectValue(OBJECT, {
            proto: this.context.getObjectValue(Object.prototype),
            properties: properties,
            propertyInfo: knowsAll ? PropInfo.KNOWS_ALL : PropInfo.MAY_HAVE_NEW,
            trueValue: trueValue
        });
    }
}

export class PropertyNode extends SemanticNode {
    computed:boolean;
    key:ExpressionNode;
    kind:'init';
    method:boolean;
    shorthand:boolean;
    value:ExpressionNode;

    track(state:EvaluationState) {
        if (this.computed) {
            this.key.track(state);
        }
        this.value.track(state);
    }

    getKeyValue():Value {
        if (this.computed) {
            return this.key.getValue();
        }
        if (this.key instanceof Later.IdentifierNode) {
            return new KnownValue(this.key.name);
        } else {
            return this.key.getValue();
        }
    }
}
Later.PropertyNode = PropertyNode;