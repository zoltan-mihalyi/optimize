import {FunctionObjectClass, PrimitiveValue, Value} from "../Value";
import {TrackingVisitor} from "../NodeVisitor";
import {CallNode, NewNode} from "../node/CallNodes";
import {AbstractFunctionExpressionNode, FunctionDeclarationNode, FunctionNode} from "../node/Functions";
import {IdentifierNode} from "../node/IdentifierNode";
import {SemanticNode} from "../node/SemanticNode";
import {AssignmentNode} from "../node/Assignments";
import {VariableDeclaratorNode} from "../node/Variables";
import {Heap, Variable} from "../Variable";
import {isValueUpdate, updateHeap} from "../Utils";
import EvaluationState = require("../EvaluationState");
import Map = require("../Map");

type Parameters = {
    arguments:Value[];
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
    return (parent instanceof CallNode || parent instanceof NewNode) && parent.callee === node;
}

function nullSafeConcat<T>(arr1:T[], arr2:T[]):T[] {
    if (arr1 === null || arr2 === null) {
        return null;
    }
    return arr1.concat(arr2);
}

export = (trackingVisitor:TrackingVisitor) => {
    let functionCalls:MultiMap<FunctionNode, Parameters>;
    let variableFunctions:MultiMap<Variable, FunctionNode>;
    let variableCalls:MultiMap<Variable, Parameters>;

    trackingVisitor.onStart(() => {
        functionCalls = new MultiMap<FunctionNode, Parameters>();
        variableFunctions = new MultiMap<Variable, FunctionNode>();
        variableCalls = new MultiMap<Variable, Parameters>();
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
            if (!(node instanceof FunctionDeclarationNode || node instanceof AbstractFunctionExpressionNode)) {
                return;
            }

            let parametersList = functionCalls.has(node) ? functionCalls.get(node) : [];

            variableFunctions.each((variable:Variable, nodes:FunctionNode[]) => { //todo bimap
                if (nodes.indexOf(node) === -1) {
                    return;
                }

                if (variable.global && !node.context.options.assumptions.noGlobalPropertyReads) {
                    parametersList = null;
                    return;
                }

                if (variableCalls.has(variable)) {
                    parametersList = nullSafeConcat(parametersList, variableCalls.get(variable));
                }
            });

            if (parametersList === null || parametersList.length === 0) { //not called/no info
                return;
            }
            for (let i = 0; i < node.params.length; i++) {
                const param = node.params[i];
                const value = getValueAt(parametersList, i);
                const variable = param.getVariable();

                const initialValues = node.innerScope.initialValues;
                if (!initialValues.has(variable) || isValueUpdate(initialValues.get(variable), value)) {
                    param.markUpdated();
                }
                initialValues.setOrUpdate(variable, value);
            }
            mergeHeap(node.innerScope.initialHeap, parametersList);
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
        if (!(callee instanceof IdentifierNode)) {
            return;
        }

        const parameters:Parameters = {
            arguments: node.arguments.map(arg => arg.getValue()),
            heap: state.getHeap()
        };
        const variable = callee.getVariable();
        onPossibleCall(state, callee, variable, parameters);
    }

    function onPossibleCall(state:EvaluationState, id:IdentifierNode, variable:Variable, parameters:Parameters) {
        if (isOuterScoped(variable, id)) {
            variableCalls.pushOrReset(variable, parameters);
        }

        state.eachVariableReference(variable, reference => {
            const objectClass = reference.objectClass;
            if (objectClass instanceof FunctionObjectClass) {
                if (objectClass.fn) {
                    functionCalls.pushOrReset(objectClass.fn, parameters);
                }
            }
        });
    }

    function onAssign(left:IdentifierNode, right:IdentifierNode) {
        const rightVariable = right.getVariable();

        if (variableFunctions.has(rightVariable)) {
            variableFunctions.push(left.getVariable(), variableFunctions.get(rightVariable));
        }
    }
};

function mergeHeap(target:Heap, parameterList:Parameters[]) {
    for (let i = 0; i < parameterList.length; i++) {
        const parameters = parameterList[i];
        parameters.heap.each((reference, heapObject) => {
            updateHeap(target, reference, heapObject);
        });
    }
}

function getValueAt(parametersList:Parameters[], index:number):Value {
    let resultValue:Value = null;
    for (let i = 0; i < parametersList.length; i++) {
        const parameters = parametersList[i].arguments;
        let value = parameters.length > index ? parameters[index] : new PrimitiveValue(void 0);

        if (resultValue === null) {
            resultValue = value;
        } else {
            resultValue = resultValue.or(value);
        }
    }
    return resultValue;
}