import {
    FunctionObjectClass,
    HeapObject,
    IterableValue,
    PrimitiveValue,
    ReferenceValue,
    Value
} from "../../tracking/Value";
import {TrackingVisitor} from "../../utils/NodeVisitor";
import {CallLikeNode, CallNode, NewNode} from "../../node/CallNodes";
import {AbstractFunctionExpressionNode, FunctionDeclarationNode, FunctionNode} from "../../node/Functions";
import {IdentifierNode} from "../../node/IdentifierNode";
import {SemanticNode} from "../../node/SemanticNode";
import {AssignmentNode} from "../../node/Assignments";
import {VariableDeclaratorNode} from "../../node/Variables";
import {Heap, Variable} from "../../utils/Variable";
import {isFunctionNode, isValueUpdate, updateHeap} from "../../utils/Utils";
import EvaluationState = require("../../tracking/EvaluationState");
import Map = require("../../utils/Map");
import Scope = require("../../tracking/Scope");

type Call = {
    parameters:Value[];
    variableValues:Map<Variable, Value>;
    heap:Heap;
};

class MultiMap<K, V> extends Map<K, V[]> {
    push(key:K, values:V[]) {
        if (this.has(key)) {
            const array = this.get(key);
            if (array !== null) {
                array.push(...values);
            }
        } else {
            this.set(key, values.slice());
        }
    }

    pushOrReset(key:K, value:V) {
        if (value === null) {
            this.setOrUpdate(key, null);
        } else {
            this.push(key, [value]);
        }
    }
}

function isOuterScoped(variable:Variable, node:IdentifierNode) {
    return variable.scope !== node.scope.findFunctionScope();
}

function isCalling(node:IdentifierNode):boolean {
    const parent = node.parent;
    return (parent instanceof CallLikeNode) && parent.callee === node;
}

function nullSafeConcat<T>(arr1:T[], arr2:T[]):T[] {
    if (arr1 === null || arr2 === null) {
        return null;
    }
    return arr1.concat(arr2);
}

export = (trackingVisitor:TrackingVisitor) => {
    let functionCalls:MultiMap<FunctionNode, Call>;
    let variableFunctions:MultiMap<Variable, FunctionNode>;
    let variableCalls:MultiMap<Variable, Call>;

    trackingVisitor.onStart(() => {
        functionCalls = new MultiMap<FunctionNode, Call>();
        variableFunctions = new MultiMap<Variable, FunctionNode>();
        variableCalls = new MultiMap<Variable, Call>();
    });

    trackingVisitor.on(FunctionDeclarationNode, (node:FunctionDeclarationNode) => {
        variableFunctions.push(node.id.getVariable(), [node]);
    });

    trackingVisitor.on(CallNode, onCall);
    trackingVisitor.on(NewNode, onCall);

    trackingVisitor.on(IdentifierNode, (node:IdentifierNode, state:EvaluationState) => {
        if (!node.isRead()) {
            return;
        }

        const parent = node.parent;
        if (isCalling(node)) {
            return; // already handled
        }

        if (parent instanceof AssignmentNode && parent.left instanceof IdentifierNode) {
            onAssign(parent.left, node);
        } else if (parent instanceof VariableDeclaratorNode) {
            onAssign(parent.id, node);
        } else {
            callsNotDeterminable(state, node);
        }
    });

    trackingVisitor.onEnd((node:SemanticNode) => {

        node.walk((node:SemanticNode) => {
            if (!isFunctionNode(node)) {
                return;
            }

            let calls = functionCalls.has(node) ? functionCalls.get(node) : [];

            variableFunctions.each((variable:Variable, nodes:FunctionNode[]) => { //todo bimap
                if (nodes.indexOf(node) === -1) {
                    return;
                }

                if (variable.global && !node.context.options.assumptions.noGlobalPropertyReads) {
                    calls = null;
                    return;
                }

                if (variableCalls.has(variable)) {
                    calls = nullSafeConcat(calls, variableCalls.get(variable));
                }
            });

            node.callCount = calls === null ? null : calls.length;
            if (calls === null || calls.length === 0) { //not called/no info
                return;
            }
            for (let i = 0; i < node.params.length; i++) {
                const param = node.params[i];
                const value = getValueAt(calls, i);
                const variable = param.getVariable();

                const initialValues = node.innerScope.initialValues;
                if (!initialValues.has(variable) || isValueUpdate(initialValues.get(variable), value)) {
                    param.markUpdated();
                }
                initialValues.setOrUpdate(variable, value);
            }
            mergeHeapAndInitialValues(node.innerScope, calls);
        });

        functionCalls = null;
        variableFunctions = null;
        variableCalls = null;
    });


    function callsNotDeterminable(state:EvaluationState, node:IdentifierNode) {
        const variable = node.getVariable();

        onPossibleCall(state, node, variable, null);
    }

    function onCall(node:CallNode | NewNode, state:EvaluationState) {
        const callee = node.callee;
        if (!(callee instanceof IdentifierNode || callee instanceof AbstractFunctionExpressionNode)) {
            return;
        }

        const parameters = node.arguments.map(arg => arg.getValue());
        const call:Call = {
            parameters: parameters,
            variableValues: state.getVariableValues(),
            heap: getHeapFor(parameters, state)
        };

        if (callee instanceof IdentifierNode) {
            onPossibleCall(state, callee, callee.getVariable(), call);
        } else {
            referenceCalled(callee.getValue() as ReferenceValue, call);
        }
    }


    function onPossibleCall(state:EvaluationState, id:IdentifierNode, variable:Variable, call:Call) {
        if (isOuterScoped(variable, id)) {
            variableCalls.pushOrReset(variable, call);
        }

        state.eachVariableReference(variable, reference => {
            referenceCalled(reference, call);
        });
    }

    function referenceCalled(reference:ReferenceValue, call:Call) {
        const objectClass = reference.objectClass;
        if (objectClass instanceof FunctionObjectClass) {
            if (objectClass.fn) {
                functionCalls.pushOrReset(objectClass.fn, call);
            }
        }
    }

    function onAssign(left:IdentifierNode, right:IdentifierNode) {
        const rightVariable = right.getVariable();

        if (variableFunctions.has(rightVariable)) {
            variableFunctions.push(left.getVariable(), variableFunctions.get(rightVariable));
        }
    }
};

function mergeHeapAndInitialValues(scope:Scope, calls:Call[]) {
    for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        call.heap.each((reference, heapObject) => {
            updateHeap(scope.initialHeap, reference, heapObject);
        });
        call.variableValues.each((variable, value) => {
            scope.initialValues.setOrUpdate(variable, value);
        });
    }
}

function getValueAt(calls:Call[], index:number):Value {
    let resultValue:Value = null;
    for (let i = 0; i < calls.length; i++) {
        const parameters = calls[i].parameters;
        let value = parameters.length > index ? parameters[index] : new PrimitiveValue(void 0);

        if (resultValue === null) {
            resultValue = value;
        } else {
            resultValue = resultValue.or(value);
        }
    }
    return resultValue;
}

function getHeapFor(parameters:Value[], state:EvaluationState):Heap {
    const heap:Heap = new Map<ReferenceValue, HeapObject>();

    parameters.forEach(param => {
        if (!(param instanceof IterableValue)) {
            return;
        }
        param.each(val => {
            if (val instanceof ReferenceValue) {
                addReference(val);
            }
        });
    });

    function addReference(reference:ReferenceValue) {
        if (!heap.has(reference)) {
            const heapObject = state.dereference(reference);
            heap.set(reference, heapObject);
            heapObject.eachReference(addReference);
        }
    }

    return heap
}