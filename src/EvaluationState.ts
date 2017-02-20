import {Value, unknown, SingleValue, ObjectValue} from "./Value";
import {Variable} from "./Variable";
import Map = require("./Map");
import Scope = require("./Scope");

class EvaluationState {
    private variableValues:Map<Variable,Value> = new Map<Variable,Value>();

    constructor(private parent:EvaluationState, private scope:Scope) {
        scope.each((name:string, variable:Variable) => {
            let value:Value;
            if (parent && parent.variableValues.has(variable)) {
            } else {
                value = variable.initialValue ? variable.initialValue : unknown;
                this.setValue(variable, value);
            }
        });
    }

    setValue(variable:Variable, value:Value) {
        let variableFunctionScope = variable.scope.findFunctionScope();
        for (let i = 0; i < variable.writes.length; i++) {
            if (variable.writes[i].scope.findFunctionScope() !== variableFunctionScope) {
                return;
            }
        }

        this.variableValues.setOrUpdate(variable, value.map((singleValue:SingleValue) => {
            if (singleValue instanceof ObjectValue) {
                return singleValue.dirty();
            } else {
                return singleValue;
            }
        }));
    }

    mergeOr(state1:EvaluationState, state2:EvaluationState) {
        const map1 = state1.variableValues;
        state1.variableValues.each((variable, value) => {
            this.variableValues.setOrUpdate(variable, value.or(state2.getValue(variable)));
        });
        state2.variableValues.each((variable, value) => {
            if (!map1.has(variable)) {
                this.orWith(variable, value);
            }
        });
    }

    mergeMaybe(state:EvaluationState) {
        state.variableValues.each((variable, value) => {
            this.orWith(variable, value);
        });
    }

    mergeBack(state:EvaluationState) {
        state.variableValues.each((variable:Variable, value:Value) => {
            if (this.hasValue(variable)) {
                this.variableValues.setOrUpdate(variable, value);
            }
        });
    }

    trackAsUnsure(tracker:(state:EvaluationState) => void) {
        const unsureState = new UnsureEvaluationState(this, this.scope);
        tracker(unsureState);

        unsureState.variableValues.each((variable) => {
            this.variableValues.setOrUpdate(variable, unknown);
        });
    }

    getValue(variable:Variable):Value {
        if (this.variableValues.has(variable)) {
            return this.variableValues.get(variable);
        }
        if (this.parent) {
            return this.parent.getValue(variable);
        }
        return unknown;
    }

    hasValue(variable:Variable):boolean {
        if (this.variableValues.has(variable)) {
            return true;
        }
        if (this.parent) {
            return this.parent.hasValue(variable);
        }
        return false;
    }

    private orWith(variable:Variable, value:Value) {
        this.variableValues.setOrUpdate(variable, this.getValue(variable).or(value));
    }
}

class UnsureEvaluationState extends EvaluationState {
    getValue() {
        return unknown;
    }
}

export = EvaluationState;