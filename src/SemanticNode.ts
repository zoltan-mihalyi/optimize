///<reference path="Expression.ts"/>
import {
    unknown,
    Value,
    KnownValue,
    ObjectValue,
    ARRAY,
    OBJECT,
    PropDescriptorMap,
    PropInfo,
    UnknownValue,
    ARGUMENTS,
    SingleValue
} from "./Value";
import {createCustomFunctionValue, getObjectValue, createValue} from "./BuiltIn";
import {equals, hasTrueValue, getTrueValue, throwValue, map, binaryCache} from "./Utils";
import {Variable} from "./Variable";
import Scope = require("./Scope");
import recast = require("recast");
import Map = require("./Map");
import EvaluationState = require("./EvaluationState");

const builders = recast.types.builders;

const global = new Function('return this')();

export abstract class SemanticNode {
    readonly type:string;
    readonly scope:Scope;
    private readonly childKeys:string[] = [];
    private changed:boolean = false;
    private updated:boolean = false;
    private original:Expression;
    private comments?:Comment[];

    constructor(source:Expression, public readonly parent:SemanticNode,
                private readonly parentObject:{[idx:string]:any}, protected readonly parentProperty:string, scope:Scope) {
        scope = this.createSubScopeIfNeeded(scope);
        this.scope = scope;

        this.original = source.original;
        for (let childKey in source) {
            this.childKeys.push(childKey);
            let sourceChild:any = (source as any)[childKey];
            if (Array.isArray(sourceChild)) {

                const semanticArray = [];
                for (let i = 0; i < sourceChild.length; i++) {
                    semanticArray.push(toSemanticNode(sourceChild[i], this, semanticArray, i + '', scope));
                }

                (this as any)[childKey] = semanticArray;
            } else if (sourceChild && sourceChild.type) {
                (this as any)[childKey] = toSemanticNode(sourceChild, this, this, childKey, scope);
            } else {
                (this as any)[childKey] = sourceChild;
            }
        }
    }

    getEnclosingFunction():FunctionDeclarationNode|AbstractFunctionExpressionNode {
        let parent = this.parent;
        while (parent) {
            if (parent instanceof FunctionDeclarationNode || parent instanceof AbstractFunctionExpressionNode) {
                return parent;
            }
            parent = parent.parent;
        }
        return null;
    }

    toAst(transform?:(node:SemanticNode, e:Expression) => Expression):Expression {
        const result:any = {};
        Object.defineProperty(result, 'original', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: this.original,
        });

        for (let i = 0; i < this.childKeys.length; i++) {
            const childKey = this.childKeys[i];
            const childNode = (this as any)[childKey];
            if (Array.isArray(childNode)) {
                (result as any)[childKey] = map(childNode, node => node.toAst(transform));
            } else if (childNode instanceof SemanticNode) {
                result[childKey] = childNode.toAst(transform);
            } else {
                result[childKey] = childNode;
            }
        }

        return transform ? transform(this, result) : result;
    }

    remove():void {
        this.replaceWith([]);
    }

    replaceWith(expressions:Expression[]):void {
        if (!this.parent) {
            throw new Error('Parent does not exist.');
        }

        const nodes:SemanticNode[] = map(expressions, e => toSemanticNode(e, this.parent, this.parentObject, this.parentProperty, this.scope));

        const removedCommentsByOriginal:Map<Expression,Comment> = new Map<Expression,Comment>();
        this.walk((node:SemanticNode) => {
            if (node instanceof Comment) {
                removedCommentsByOriginal.set(node.original, node);
            }
        });

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.walk((node:SemanticNode) => {
                if (node instanceof Comment) {
                    removedCommentsByOriginal.remove(node.original);
                }
            });
        }
        removedCommentsByOriginal.each((original:Expression, comment:Comment) => {
            if (nodes.length > 0) {
                nodes[0].addComment(comment);
            } else {
                this.parent.addComment(comment);
            }
        });

        console.log('REPLACED ' + recast.print(this.toAst()).code + ' WITH ' + expressions.map(e => recast.print(e).code));

        if (Array.isArray(this.parentObject)) {
            const index = this.parentObject.indexOf(this);
            this.parentObject.splice.apply(this.parentObject, [index, 1, ...nodes]);
        } else {
            if (nodes.length !== 1) {
                throw new Error('Must be 1.');
            }
            this.parentObject[this.parentProperty] = nodes[0];
        }
        this.markChanged();
    }

    hasParent(predicate:(node:SemanticNode) => boolean):boolean {
        let parent = this.parent;
        while (parent) {
            if (predicate(parent)) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    addComment(comment:Comment) {
        if (!this.comments) {
            this.comments = [];
            if (this.childKeys.indexOf('comments') === -1) {
                this.childKeys.push('comments');
            }
        }
        this.comments.push(comment);
    }

    contains(predicate:(node:SemanticNode) => boolean):boolean {
        return this.walk(predicate) || false;
    }

    containsType(type:new(...args:any[]) => SemanticNode):boolean {
        return this.contains(node => node instanceof type);
    }

    walk<T>(before:(node:this) => T):T {
        let result:T = before(this);
        if (result) {
            return result;
        }
        for (let i = 0; i < this.childKeys.length; i++) {
            const key = this.childKeys[i];
            let sub = (this as any)[key];
            if (sub instanceof SemanticNode) {
                let result:T = sub.walk(before);
                if (result) {
                    return result;
                }
            } else if (Array.isArray(sub)) {
                for (let j = 0; j < sub.length; j++) {
                    let result:T = (sub[j] as SemanticNode).walk(before);
                    if (result) {
                        return result;
                    }
                }
            }
        }
    }

    initialize() {
        this.walk(node => node.handleDeclarationsForNode());
        this.walk(node => node.updateAccessForNode());
        this.walk(node => node.initializeNode());
    }

    isUpdated():boolean {
        return this.updated;
    }

    isChanged():boolean {
        return this.changed;
    }

    clearUpdated() {
        this.updated = false;
    }

    getDeclarations():Expression[] {
        if (!(this instanceof BlockNode)) {
            return [];
        }
        const enclosingFunction = this.getEnclosingFunction();
        const result:Expression[] = [];
        this.walk((node:SemanticNode) => {
            if (node instanceof FunctionDeclarationNode) {
                if (node.getEnclosingFunction() === enclosingFunction) {
                    result.push(node.toAst());
                }
            } else if (node instanceof VariableDeclarationNode && !node.isBlockScoped()) {
                if (node.getEnclosingFunction() === enclosingFunction) {
                    let declaration = node.toAst() as any;
                    for (let i = 0; i < declaration.declarations.length; i++) {
                        declaration.declarations[i].init = null;
                    }
                    result.push(declaration);
                }
            }
        });
        return result;
    }

    protected handleDeclarationsForNode() {
    }

    protected updateAccessForNode() {
    }

    protected initializeNode() {
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        return scope;
    }

    protected markChanged() {
        if (this.parent) {
            this.parent.markChanged();
        }
        this.changed = true;
        this.updated = true;
    }

    protected markUpdated() {
        if (this.parent) {
            this.parent.markUpdated();
        }
        this.updated = true;
    }

    abstract track(state:EvaluationState):void;
}

export abstract class SemanticExpression extends SemanticNode {
    protected calculatedValue:Value = this.isClean() ? this.getInitialValue() : unknown;

    isClean():boolean {
        if (this.calculatedValue && !(this.calculatedValue instanceof UnknownValue)) {
            return true;
        } else {
            return this.isCleanInner();
        }
    }

    getValue():Value {
        return this.calculatedValue;
    }

    setValue(value:Value) {
        if (value instanceof UnknownValue) {
            return;
        }
        if (value instanceof KnownValue) {
            let primitiveValue = value.value;
            if (primitiveValue === void 0) {
                if (!(this instanceof UnaryNode && this.operator === 'void' && this.argument instanceof LiteralNode && this.argument.value === 0)) {
                    this.replaceWith([builders.unaryExpression('void', builders.literal(0), true)]);
                }
            } else if (typeof primitiveValue === 'number' && (primitiveValue < 0 || 1 / primitiveValue < 0)) {
                if (!(this instanceof UnaryNode && this.operator === '-' && this.argument instanceof LiteralNode && this.argument.value === -primitiveValue)) {
                    this.replaceWith([builders.unaryExpression('-', builders.literal(-primitiveValue))]);
                }
            } else {
                if (!(this instanceof LiteralNode) || !equals(this.value, primitiveValue)) {
                    this.replaceWith([builders.literal(primitiveValue)]);
                    return;
                }
            }
        }

        if (this.calculatedValue.equals(value)) {
            return;
        }

        this.calculatedValue = value;
        this.markUpdated();
    }

    protected markUpdated() {
        super.markUpdated();
        if (this.calculatedValue instanceof UnknownValue && this.isClean()) {
            this.calculatedValue = this.getInitialValue();
        }
    }

    protected getInitialValue():Value {
        return unknown;
    }

    protected abstract isCleanInner():boolean;
}

export abstract class LoopNode extends SemanticNode {
    body:SemanticNode;
}

export abstract class ForEachNode extends LoopNode {
    left:IdentifierNode|VariableDeclarationNode;
    right:SemanticExpression;
    innerScope:Scope;

    protected updateAccessForNode() {
        if (this.left instanceof IdentifierNode) {
            this.scope.getOrCreate(this.left.name).writes.push(this.left);
        }
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        this.innerScope = new Scope(scope, true);
        return super.createSubScopeIfNeeded(scope);
    }

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            const identifier = this.left instanceof IdentifierNode ? this.left : this.left.declarations[0].id;
            state.setValue(identifier.getVariable(), unknown);
            this.body.track(state)
        });
    }
}

abstract class Comment extends SemanticNode {
    leading:boolean;
    trailing:boolean;
    value:string;

    track() {
    }
}

function addParametersToScope(params:IdentifierNode[], scope:Scope, addArguments:boolean) {
    for (let i = 0; i < params.length; i++) {
        scope.set(params[i].name, false, unknown).writes.push(params[i]);
    }
    if (addArguments) {
        scope.set('arguments', false, new ObjectValue(ARGUMENTS, {
            proto: getObjectValue(Object.prototype),
            properties: {},
            propertyInfo: PropInfo.MAY_HAVE_NEW, //todo no override, but enumerable. separate!!!
            trueValue: null
        }));
    }
}

export abstract class AbstractFunctionExpressionNode extends SemanticExpression {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:SemanticExpression|BlockNode;
    innerScope:Scope;
    expression:boolean;

    track() {
    }

    getReturnExpression():SemanticExpression {
        let body = this.body;
        if (this.expression) {
            return body as SemanticExpression;
        } else if (body instanceof BlockNode && body.body.length === 1) {
            const statement = body.body[0];
            if (statement instanceof ReturnNode) {
                return statement.argument;
            }
        }
        return null;
    }

    protected isCleanInner():boolean {
        return true;
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this.params, this.body.scope, !this.isLambda());
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope { //todo duplicate
        this.innerScope = new Scope(scope, false);
        return scope;
    }

    protected getInitialValue():Value {
        return createCustomFunctionValue(this.params.length);
    }

    protected abstract isLambda():boolean;
}

export class ArrayNode extends SemanticExpression {
    elements:SemanticExpression[];

    track(state:EvaluationState) {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.track(state);
        }
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (!element.isClean()) {
                return false;
            }
        }
        return true;
    }

    protected getInitialValue():Value {
        const properties:PropDescriptorMap = {
            length: {
                enumerable: false,
                value: new KnownValue(this.elements.length)
            }
        };
        let trueValue:any[] = [];
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            let value = element.getValue();
            properties[i] = {
                enumerable: true,
                value: value
            };
            if (trueValue && hasTrueValue(value)) {
                trueValue.push(getTrueValue(value));
            } else {
                trueValue = null;
            }
        }
        return new ObjectValue(ARRAY, {
            proto: getObjectValue(Array.prototype),
            properties: properties,
            propertyInfo: PropInfo.KNOWS_ALL,
            trueValue: trueValue
        });
    }
}

export class ArrowFunctionExpressionNode extends AbstractFunctionExpressionNode {
    protected isLambda():boolean {
        return true;
    }
}

export class AssignmentNode extends SemanticExpression {
    left:SemanticExpression;
    operator:string;
    right:SemanticExpression;

    track(state:EvaluationState) {
        if (!(this.left instanceof IdentifierNode)) {
            return;
        }
        const rightValue = this.right.getValue();
        const operator = this.operator;
        if (operator === '=') {
            state.setValue(this.left.getVariable(), rightValue);
            return;
        }

        const variable = this.left.getVariable();
        const leftValue = state.getValue(variable);

        const evaluator = binaryCache.get(operator.substring(0, operator.length - 1));
        state.setValue(variable, leftValue.product(rightValue, (left:SingleValue, right:SingleValue) => {
            if (hasTrueValue(left) && hasTrueValue(right)) {
                return createValue(evaluator(getTrueValue(left), getTrueValue(right)));
            }
            return unknown;
        }));
    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.left instanceof IdentifierNode) {
            this.scope.getOrCreate(this.left.name).writes.push(this.left);
        }
    }
}

export class BinaryNode extends SemanticExpression {
    operator:string;
    left:SemanticExpression;
    right:SemanticExpression;

    track(state:EvaluationState) {
        this.left.track(state);
        this.right.track(state);
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class BlockComment extends Comment {
}

export class BlockNode extends SemanticNode {
    body:SemanticNode[];

    track(state:EvaluationState) {
        const blockState = new EvaluationState(state, this.scope);
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (node instanceof FunctionDeclarationNode) {
                node.track(blockState);
            }
        }
        for (let i = 0; i < this.body.length; i++) {
            const node = this.body[i];
            if (!(node instanceof FunctionDeclarationNode)) {
                node.track(blockState);
            }
        }
        state.mergeBack(blockState);

    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof AbstractFunctionExpressionNode || this.parent instanceof FunctionDeclarationNode || this.parent instanceof ForEachNode) {
            return this.parent.innerScope;
        }
        return new Scope(scope, !!this.parent);
    }
}

export class BreakNode extends SemanticNode {
    track() {
    }
}

export class CallNode extends SemanticExpression {
    callee:SemanticExpression;
    arguments:SemanticExpression[];

    track(state:EvaluationState) {
        this.callee.track(state);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state);
        }
    }

    protected isCleanInner():boolean {
        return false;
    }
}

export class CatchNode extends SemanticNode {
    param:IdentifierNode;
    body:BlockNode;

    track(state:EvaluationState) {
        this.body.track(state);
    }
}

export class ConditionalNode extends SemanticExpression {
    test:SemanticExpression;
    consequent:SemanticExpression;
    alternate:SemanticExpression;

    track(state:EvaluationState) {
        this.test.track(state);
        const consequentCtx = new EvaluationState(state, this.scope);
        this.consequent.track(consequentCtx);
        const alternateCtx = new EvaluationState(state, this.scope);
        this.alternate.track(alternateCtx);
        state.mergeOr(consequentCtx, alternateCtx);
    }

    protected isCleanInner():boolean {
        return this.test.isClean() && this.consequent.isClean() && this.alternate.isClean();
    }
}

export class ContinueNode extends SemanticNode {

    track() {
    }
}

export class DoWhileNode extends LoopNode {
    test:SemanticExpression;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.body.track(state);
            this.test.track(state);
        });
    }
}

export class EmptyNode extends SemanticNode {
    track() {
    }
}

export class ExpressionStatementNode extends SemanticNode {
    expression:SemanticExpression;
    directive?:string;

    isDirective():boolean {
        return typeof this.directive === 'string';
    }

    track(state:EvaluationState) {
        this.expression.track(state);
    }
}

export class ForInNode extends ForEachNode {
}

export class ForOfNode extends ForEachNode {
}

export class ForNode extends LoopNode {
    init:SemanticNode;
    test:SemanticExpression;
    update:SemanticNode;

    track(state:EvaluationState) {
        if (this.init) {
            this.init.track(state);
        }
        state.trackAsUnsure(state => {
            if (this.test) {
                this.test.track(state);
            }
            this.body.track(state);
            if (this.update) {
                this.update.track(state);
            }
        });
    }
}

export class FunctionDeclarationNode extends SemanticNode {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:BlockNode;
    innerScope:Scope;

    track(state:EvaluationState) {
        state.setValue(this.id.getVariable(), createCustomFunctionValue(this.params.length));
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this.params, this.body.scope, true);
        let variable = this.scope.set(this.id.name, false, unknown);
        variable.writes.push(this.id);
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        this.innerScope = new Scope(scope, false);
        return scope;
    }
}

export class FunctionExpressionNode extends AbstractFunctionExpressionNode {
    protected isLambda():boolean {
        return false;
    }
}

export class IdentifierNode extends SemanticExpression {
    readonly name:string;

    protected isCleanInner():boolean {
        let variable = this.getVariable();
        if (!variable) {
            return false;
        }
        return !!variable.initialValue;
    }

    track(state:EvaluationState) {
        if (!this.isRead()) {
            return;
        }
        let variable = this.getVariable();
        this.setValue(state.getValue(variable));
    }

    getVariable():Variable {
        return this.scope.get(this.name);
    }

    isReal():boolean {
        if (this.parent instanceof AbstractFunctionExpressionNode && this.parent.id === this) {
            return false;
        }
        if (this.parent instanceof LabeledNode || this.parent instanceof BreakNode || this.parent instanceof ContinueNode) {
            return false;
        }
        if (this.parent instanceof PropertyNode && this.parent.key === this && !this.parent.computed) {
            return false;
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof MemberNode && this.parent.property === this && !this.parent.computed) {
            return false;
        }
        return true;
    }

    isRead():boolean {
        if (!this.isReal()) {
            return false;
        }

        if (this.parent instanceof ForEachNode && this.parent.left === this) {
            return false;
        }
        if (this.parent instanceof VariableDeclaratorNode && this.parent.id === this) {
            return false; //just initializing
        }
        if (this.parent instanceof FunctionDeclarationNode || this.parent instanceof AbstractFunctionExpressionNode) {
            return false; //function declaration/parameter
        }
        //noinspection RedundantIfStatementJS
        if (this.parent instanceof AssignmentNode && this.parent.left === this) {
            return false; //assignment
        }
        return true;
    }

    refersToSame(identifier:IdentifierNode):boolean {
        if (!identifier.isReal()) {
            return false;
        }
        return this.scope.getOrCreate(this.name) === identifier.scope.getOrCreate(identifier.name);
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof FunctionDeclarationNode || this.parent instanceof AbstractFunctionExpressionNode) {
            if (this.parentProperty !== "id") {
                return this.parent.innerScope;
            }
        }
        return super.createSubScopeIfNeeded(scope);
    }

    protected updateAccessForNode() {
        if (this.isRead()) {
            let variable = this.scope.getOrCreate(this.name);
            variable.reads.push(this);
            if (variable.initialValue) {
                this.setValue(variable.initialValue);
            }
        }
    }
}

export class IfNode extends SemanticNode {
    test:SemanticExpression;
    consequent:SemanticNode;
    alternate:SemanticNode;

    track(state:EvaluationState) {
        this.test.track(state);
        const consequentCtx = new EvaluationState(state, this.scope);
        this.consequent.track(consequentCtx);

        if (this.alternate) {
            const alternateCtx = new EvaluationState(state, this.scope);
            this.alternate.track(alternateCtx);
            state.mergeOr(consequentCtx, alternateCtx);
        } else {
            state.mergeOr(state, consequentCtx); //todo different method
        }
    }
}

export class LabeledNode extends SemanticNode {
    label:IdentifierNode;
    body:SemanticNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => this.body.track(state));
    }
}

export class LineComment extends Comment {
}

export class LiteralNode extends SemanticExpression {
    value:any;
    raw:string;

    track() {
    }

    protected isCleanInner():boolean {
        return true;
    }

    protected getInitialValue():Value {
        if (typeof this.value !== 'object' || this.value === null) {
            return new KnownValue(this.value);
        } else {
            return getObjectValue(this.value);
        }
    }
}

export class LogicalNode extends BinaryNode {
    isClean():boolean {
        return this.left.isClean() && this.right.isClean();
    }
}

export class MemberNode extends SemanticExpression {
    object:SemanticExpression;
    property:SemanticExpression;
    computed:boolean;

    protected isCleanInner():boolean {
        return false; //todo
    }

    track(state:EvaluationState) {
        this.object.track(state);
        this.property.track(state);
    }

    getPropertyValue():Value {
        return !this.computed ? new KnownValue((this.property as IdentifierNode).name) : this.property.getValue();
    }
}

export class NewNode extends SemanticExpression {
    callee:SemanticExpression;
    arguments:SemanticExpression[];

    protected isCleanInner():boolean {
        return false;
    }

    track(state:EvaluationState) {
        this.callee.track(state);
        for (let i = 0; i < this.arguments.length; i++) {
            this.arguments[i].track(state);
        }
    }

}

export class ObjectNode extends SemanticExpression {
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
            proto: getObjectValue(Object.prototype),
            properties: properties,
            propertyInfo: knowsAll ? PropInfo.KNOWS_ALL : PropInfo.MAY_HAVE_NEW,
            trueValue: trueValue
        });
    }
}

export class ProgramNode extends BlockNode {
    errors:any[];
    sourceType:string;

    protected handleDeclarationsForNode() {
        this.saveApi('undefined');
        this.saveApi('Infinity');
        this.saveApi('NaN');
        this.saveApi('eval');
        this.saveApi('isNaN');
        this.saveApi('parseFloat');
        this.saveApi('parseInt');
        this.saveApi('decodeURI');
        this.saveApi('decodeURIComponent');
        this.saveApi('encodeURI');
        this.saveApi('encodeURIComponent');
        this.saveApi('Object');
        this.saveApi('Function');
        this.saveApi('Array');
        this.saveApi('Boolean');
        this.saveApi('Error');
        this.saveApi('EvalError');
        this.saveApi('RangeError');
        this.saveApi('ReferenceError');
        this.saveApi('SyntaxError');
        this.saveApi('TypeError');
        this.saveApi('URIError');
        this.saveApi('Number');
        this.saveApi('String');
        this.saveApi('Boolean');
        this.saveApi('RegExp');
        this.saveApi('Math');
        this.saveApi('Date');
    }

    private saveApi(name:string) {
        this.scope.set(name, true, createValue(global[name]));
    }
}

export class PropertyNode extends SemanticNode {
    computed:boolean;
    key:SemanticExpression;
    kind:'init';
    method:boolean;
    shorthand:boolean;
    value:SemanticExpression;

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
        if (this.key instanceof IdentifierNode) {
            return new KnownValue(this.key.name);
        } else {
            return this.key.getValue();
        }
    }
}

export class SwitchCaseNode extends SemanticNode {
    test:SemanticExpression;
    consequent:SemanticNode[];

    track(state:EvaluationState) {
        if (this.test) {
            this.test.track(state);
        }
        for (let i = 0; i < this.consequent.length; i++) {
            this.consequent[i].track(state);
        }
    }
}

export class SwitchStatementNode extends SemanticNode {
    discriminant:SemanticExpression;
    cases:SwitchCaseNode[];

    track(state:EvaluationState) {
        this.discriminant.track(state);
        state.trackAsUnsure(state => {
            for (let i = 0; i < this.cases.length; i++) {
                this.cases[i].track(state);
            }
        });
    }
}

export class ReturnNode extends SemanticNode {
    argument:SemanticExpression;

    track(state:EvaluationState) {
        if (this.argument) {
            this.argument.track(state);
        }
    }
}

export class UnaryNode extends SemanticExpression {
    argument:SemanticExpression;
    operator:string;

    track(state:EvaluationState) {
        this.argument.track(state);
    }

    protected isCleanInner():boolean {
        return (this.operator === 'void' || this.operator === 'typeof') && this.argument.isClean();
    }
}

export class ThisNode extends SemanticExpression {
    protected isCleanInner():boolean {
        return true;
    }

    track(state:EvaluationState) {
    }
}

export class ThrowNode extends SemanticNode {
    argument:SemanticExpression;

    track(state:EvaluationState) {
        this.argument.track(state);
    }
}

export class TryNode extends SemanticNode {
    block:BlockNode;
    handler:CatchNode;
    finalizer:BlockNode;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.block.track(state);
            if (this.handler) {
                this.handler.track(state)
            }
        });
        if (this.finalizer) {
            this.finalizer.track(state);
        }
    }
}

export class SequenceNode extends SemanticExpression {
    expressions:SemanticExpression[];

    track(state:EvaluationState) {
        for (let i = 0; i < this.expressions.length; i++) {
            this.expressions[i].track(state);
        }
    }

    protected isCleanInner():boolean {
        for (let i = 0; i < this.expressions.length; i++) {
            if (!this.expressions[i].isClean()) {
                return false;
            }
        }
        return true;
    }
}

export class UpdateNode extends SemanticExpression {
    argument:SemanticExpression;
    operator:string;
    prefix:boolean;

    track(state:EvaluationState) {
        if (!(this.argument instanceof IdentifierNode)) {
            return;
        }
        const variable = this.argument.getVariable();
        state.setValue(variable, state.getValue(variable).map((value:SingleValue) => {
            if (hasTrueValue(value)) {
                let numberValue:number = +getTrueValue(value);
                return new KnownValue(this.operator === '++' ? numberValue + 1 : numberValue - 1);
            } else {
                return unknown;
            }
        }));
    }

    protected isCleanInner():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.argument instanceof IdentifierNode) {
            this.scope.getOrCreate(this.argument.name).writes.push(this.argument);
        }
    }
}

export class VariableDeclarationNode extends SemanticNode {
    declarations:VariableDeclaratorNode[];
    kind:'var'|'const'|'let';

    isBlockScoped() {
        return this.kind !== 'var';
    }

    track(state:EvaluationState) {
        for (let i = 0; i < this.declarations.length; i++) {
            this.declarations[i].track(state);
        }
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        if (this.parent instanceof ForEachNode) {
            return this.parent.innerScope;
        }
        return super.createSubScopeIfNeeded(scope);
    }
}

export class VariableDeclaratorNode extends SemanticNode {
    parent:VariableDeclarationNode;
    id:IdentifierNode;
    init:SemanticExpression;

    track(state:EvaluationState) {
        if (this.init) {
            state.setValue(this.id.getVariable(), this.init.getValue());
        }
    }

    protected handleDeclarationsForNode() {
        const parent = this.parent;
        let blockScoped = parent.isBlockScoped();
        let variable;
        let isWrite;
        if (parent.parent instanceof ForEachNode) {
            variable = parent.parent.body.scope.set(this.id.name, blockScoped, unknown);
            isWrite = true;
        } else {
            variable = this.scope.set(this.id.name, blockScoped, blockScoped ? null : unknown);
            isWrite = !!this.init;
        }
        if (isWrite) {
            variable.writes.push(this.id);
        }
    }
}

export class WhileNode extends LoopNode {
    test:SemanticExpression;

    track(state:EvaluationState) {
        state.trackAsUnsure(state => {
            this.test.track(state);
            this.body.track(state);
        });
    }
}

const typeToNodeMap:{[type:string]:new(e:Expression, parent:SemanticNode, parentObject:any, parentProperty:string, scope:Scope) => SemanticNode} = {
    'ArrayExpression': ArrayNode,
    'ArrowFunctionExpression': ArrowFunctionExpressionNode,
    'AssignmentExpression': AssignmentNode,
    'BinaryExpression': BinaryNode,
    'Block': BlockComment,
    'BlockStatement': BlockNode,
    'BreakStatement': BreakNode,
    'CallExpression': CallNode,
    'CatchClause': CatchNode,
    'ConditionalExpression': ConditionalNode,
    'ContinueStatement': ContinueNode,
    'DoWhileStatement': DoWhileNode,
    'EmptyStatement': EmptyNode,
    'ExpressionStatement': ExpressionStatementNode,
    'ForInStatement': ForInNode,
    'ForOfStatement': ForOfNode,
    'ForStatement': ForNode,
    'FunctionDeclaration': FunctionDeclarationNode,
    'FunctionExpression': FunctionExpressionNode,
    'Identifier': IdentifierNode,
    'IfStatement': IfNode,
    'LabeledStatement': LabeledNode,
    'Line': LineComment,
    'Literal': LiteralNode,
    'LogicalExpression': LogicalNode,
    'MemberExpression': MemberNode,
    'NewExpression': NewNode,
    'ObjectExpression': ObjectNode,
    'Program': ProgramNode,
    'Property': PropertyNode,
    'ReturnStatement': ReturnNode,
    'SequenceExpression': SequenceNode,
    'SwitchCase': SwitchCaseNode,
    'SwitchStatement': SwitchStatementNode,
    'ThisExpression': ThisNode,
    'ThrowStatement': ThrowNode,
    'TryStatement': TryNode,
    'UnaryExpression': UnaryNode,
    'UpdateExpression': UpdateNode,
    'VariableDeclaration': VariableDeclarationNode,
    'VariableDeclarator': VariableDeclaratorNode,
    'WhileStatement': WhileNode
};

function toSemanticNode(expression:Expression, parent:SemanticNode, parentObject:any, parentProperty:string, scope:Scope):SemanticNode {
    let Node = typeToNodeMap[expression.type];
    if (Node) {
        return new Node(expression, parent, parentObject, parentProperty, scope);
    } else {
        throw new Error('Unknown node:' + expression.type);
    }
}

export function semantic(expression:Expression):SemanticNode {
    if ((expression as any).errors && (expression as any).errors.length) {
        throw (expression as any).errors[0];
    }
    const node = toSemanticNode(expression, null, null, null, null);
    node.initialize();
    return node;
}