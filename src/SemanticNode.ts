///<reference path="Expression.ts"/>
import {unknown, Value, KnownValue, ObjectValue, ARRAY, FUNCTION, OBJECT} from "./Value";
import Scope = require("./Scope");
import recast = require("recast");

const builders = recast.types.builders;

export abstract class SemanticNode {
    readonly type:string;
    readonly scope:Scope;
    private readonly childKeys:string[] = [];
    private changed:boolean = false;
    private updated:boolean = false;

    constructor(source:Expression, public readonly parent:SemanticNode,
                private readonly parentObject:{[idx:string]:any}, private readonly parentProperty:string, scope:Scope) {
        scope = this.createSubScopeIfNeeded(scope);
        this.scope = scope;

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

    getEnclosingFunction():FunctionDeclarationNode|FunctionExpressionNode {
        let parent = this.parent;
        while (parent) {
            if (parent instanceof FunctionDeclarationNode || parent instanceof FunctionExpressionNode) {
                return parent;
            }
            parent = parent.parent;
        }
        return null;
    }

    toAst():Expression {
        const result:any = {};

        for (let i = 0; i < this.childKeys.length; i++) {
            const childKey = this.childKeys[i];
            const childNode = (this as any)[childKey];
            if (Array.isArray(childNode)) {
                (result as any)[childKey] = map(childNode, node => node.toAst());
            } else if (childNode instanceof SemanticNode) {
                result[childKey] = childNode.toAst();
            } else {
                result[childKey] = childNode;
            }
        }

        return result as Expression;
    }

    remove():void {
        this.replaceWith([]);
    }

    replaceWith(expressions:Expression[]):void {
        if (!this.parent) {
            throw new Error('Parent does not exist.');
        }

        console.log('REPLACED ' + recast.print(this.toAst()).code + ' WITH ' + expressions.map(e => recast.print(e).code));

        const nodes:SemanticNode[] = map(expressions, e => toSemanticNode(e, this.parent, this.parentObject, this.parentProperty, this.scope));

        if (Array.isArray(this.parentObject)) {
            const index = this.parentObject.indexOf(this);
            this.parentObject.splice.apply(this.parentObject, [index, 1, ...nodes]);
        } else {
            if (nodes.length !== 1) {
                throw new Error('Must be 1.');
            }
            this.parentObject[this.parentProperty] = nodes[0];
        }
        // this.replaced = true;
        this.markChanged();
    }

    contains(predicate:(node:SemanticNode) => boolean):boolean {
        return this.walk(predicate) || false;
    }

    containsType(type:new(...args:any[]) => SemanticNode):boolean {
        return this.contains(node => node instanceof type);
    }

    walk<T>(before:(node:this) => T, after?:(node:this) => T):T {
        if (before) {
            let result:T = before(this);
            if (result) {
                return result;
            }
        }
        for (let i = 0; i < this.childKeys.length; i++) {
            const key = this.childKeys[i];
            let sub = (this as any)[key];
            if (sub instanceof SemanticNode) {
                let result:T = sub.walk(before, after);
                if (result) {
                    return result;
                }
            } else if (Array.isArray(sub)) {
                for (var j = 0; j < sub.length; j++) {
                    let result:T = (sub[j] as SemanticNode).walk(before, after);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        if (after) {
            let result:T = after(this);
            if (result) {
                return result;
            }
        }
    }

    handleDeclarations() {
        this.walk(node => node.handleDeclarationsForNode());
    }

    updateAccess() {
        this.walk(node => node.updateAccessForNode());
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

    protected handleDeclarationsForNode() {
    }

    protected updateAccessForNode() {
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
}

abstract class SemanticExpression extends SemanticNode {
    protected calculatedValue:Value = this.isClean() ? this.getInitialValue() : unknown;

    abstract isClean():boolean;

    getValue():Value {
        return this.calculatedValue;
    }

    setValue(value:Value) {
        if (value instanceof KnownValue) {
            if (value.value === void 0) {
                if (!(this instanceof UnaryNode && this.operator === 'void' && this.argument instanceof LiteralNode && this.argument.value === 0)) {
                    this.replaceWith([builders.unaryExpression('void', builders.literal(0), true)]);
                    return;
                }
            } else {
                if (!(this instanceof LiteralNode)) { //todo value check
                    this.replaceWith([builders.literal(value.value)]);
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

    protected getInitialValue():Value {
        return unknown;
    }
}

export abstract class ForEachNode extends SemanticNode {
    left:SemanticExpression;
    right:SemanticExpression;
    body:SemanticNode;
}

export class ArrayNode extends SemanticExpression {
    elements:SemanticExpression[];

    isClean():boolean {
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (!element.isClean()) {
                return false;
            }
        }
        return true;
    }

    protected getInitialValue():Value {
        return new ObjectValue(ARRAY);
    }
}

export class AssignmentNode extends SemanticExpression {
    left:SemanticExpression;
    operator:string;
    right:SemanticExpression;

    isClean():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.left instanceof IdentifierNode) {
            this.scope.get(this.left.name).writes.push(this);
        }
    }
}

export class BinaryNode extends SemanticExpression {
    operator:string;
    left:SemanticExpression;
    right:SemanticExpression;

    isClean():boolean {
        return false;
    }
}

export class BlockNode extends SemanticNode {
    body:SemanticNode[];

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        return new Scope(scope);
    }
}

export class BreakNode extends SemanticNode {
}

export class CallNode extends SemanticExpression {
    callee:SemanticExpression;
    arguments:SemanticExpression[];

    isClean():boolean {
        return false;
    }
}

export class ConditionalNode extends SemanticExpression {
    test:SemanticExpression;
    consequent:SemanticExpression;
    alternate:SemanticExpression;

    isClean():boolean {
        return this.test.isClean() && this.consequent.isClean() && this.alternate.isClean();
    }
}

export class ContinueNode extends SemanticNode {
}

export class ExpressionStatementNode extends SemanticNode {
    expression:SemanticExpression;
    directive?:string;

    isDirective():boolean {
        return typeof this.directive === 'string';
    }
}

export class ForInNode extends ForEachNode {
}

export class ForOfNode extends ForEachNode {
}

export class ForNode extends SemanticNode {
    init:SemanticNode;
    test:SemanticExpression;
    update:SemanticNode;
    body:SemanticNode;
}

function addParametersToScope(params:IdentifierNode[], scope:Scope) {
    for (let i = 0; i < params.length; i++) {
        scope.set(params[i].name, false);
    }
}

export class FunctionDeclarationNode extends SemanticNode {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:BlockNode;

    protected handleDeclarationsForNode() {
        addParametersToScope(this.params, this.body.scope);
        this.scope.set(this.id.name, false);
    }
}

export class FunctionExpressionNode extends SemanticExpression {
    id:IdentifierNode;
    params:IdentifierNode[];
    body:SemanticNode;

    isClean():boolean {
        return true;
    }

    protected handleDeclarationsForNode() {
        addParametersToScope(this.params, this.body.scope);
    }

    protected getInitialValue():Value {
        return new ObjectValue(FUNCTION);
    }
}

export class IdentifierNode extends SemanticExpression {
    readonly name:string;

    isClean():boolean {
        return this.scope.has(this.name); //todo let and const!
    }

    isReal():boolean {
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

        if (this.parent instanceof VariableDeclaratorNode && this.parent.id === this) {
            return false; //just initializing
        }
        if (this.parent instanceof FunctionDeclarationNode) {
            return false; //function declaration
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
        return this.scope.get(this.name) === identifier.scope.get(identifier.name);
    }

    protected updateAccessForNode() {
        let loopNode = this.findEnclosingLoop();
        if (loopNode) {
            this.scope.get(this.name).writes.push(loopNode);
        } else if (this.isRead()) {
            this.scope.get(this.name).reads.push(this);
        }
    }

    private findEnclosingLoop():ForEachNode {
        let enclosingLoop = this.parent;
        if (enclosingLoop instanceof VariableDeclaratorNode) {
            enclosingLoop = enclosingLoop.parent.parent;
        }
        return (enclosingLoop instanceof ForEachNode) && enclosingLoop.left === this ? enclosingLoop : null;
    }
}

export class IfNode extends SemanticNode {
    test:SemanticExpression;
    consequent:SemanticNode;
    alternate:SemanticNode;
}

export class LabeledNode extends SemanticNode {
    label:IdentifierNode;
    body:SemanticNode;
}

export class LiteralNode extends SemanticExpression {
    value:any;
    raw:string;

    isClean():boolean {
        return true;
    }

    protected getInitialValue():Value {
        if (typeof this.value !== 'object' || this.value === null) {
            return new KnownValue(this.value);
        } else {
            return super.getInitialValue();
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

    isClean():boolean {
        return false;
    }

    getPropertyValue():Value {
        return !this.computed ? new KnownValue((this.property as IdentifierNode).name) : this.property.getValue();
    }
}

export class ObjectNode extends SemanticExpression {
    properties:PropertyNode[];

    isClean():boolean {
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
        return new ObjectValue(OBJECT);
    }
}

export class ProgramNode extends BlockNode {
    errors:any[];
    sourceType:string;

    protected handleDeclarationsForNode() {
        this.saveApi('Math');
        this.saveApi('Date');
    }

    private saveApi(name:string) {
        this.scope.set(name, true);
    }
}

export class PropertyNode extends SemanticNode {
    computed:boolean;
    key:SemanticExpression;
    kind:'init';
    method:boolean;
    shorthand:boolean;
    value:SemanticExpression;
}

export class SwitchCaseNode extends SemanticNode {
    test:SemanticExpression;
    consequent:SemanticNode[];
}

export class SwitchStatementNode extends SemanticNode {
    discriminant:SemanticExpression;
    cases:SwitchCaseNode[];
}

export class ReturnNode extends SemanticNode {
    argument:SemanticExpression;
}

export class UnaryNode extends SemanticExpression {
    argument:SemanticExpression;
    operator:string;

    isClean():boolean {
        return (this.operator === 'void' || this.operator === 'typeof') && this.argument.isClean();
    }
}

export class UpdateNode extends SemanticExpression {
    argument:SemanticExpression;
    operator:string;
    prefix:boolean;

    isClean():boolean {
        return false;
    }

    protected updateAccessForNode() {
        if (this.argument instanceof IdentifierNode) {
            this.scope.get(this.argument.name).writes.push(this);
        }
    }
}

export class VariableDeclarationNode extends SemanticNode {
    declarations:VariableDeclaratorNode[];
    kind:'var'|'const'|'let';

    isBlockScoped() {
        return this.kind !== 'var';
    }
}

export class VariableDeclaratorNode extends SemanticNode {
    parent:VariableDeclarationNode;
    id:IdentifierNode;
    init:SemanticNode;

    protected handleDeclarationsForNode() {
        this.scope.set(this.id.name, this.parent.isBlockScoped());
    }

    protected updateAccessForNode() {
        if (this.init) {
            this.scope.get(this.id.name).writes.push(this);
        }
    }
}

export class WhileNode extends SemanticNode {
    test:SemanticExpression;
    body:SemanticNode;
}

function map<S,T>(data:S[], transform:(source:S) => T):T[] {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        result.push(transform(data[i]));
    }
    return result;
}

const typeToNodeMap:{[type:string]:new(e:Expression, parent:SemanticNode, parentObject:any, parentProperty:string, scope:Scope) => SemanticNode} = {
    'ArrayExpression': ArrayNode,
    'AssignmentExpression': AssignmentNode,
    'BinaryExpression': BinaryNode,
    'BlockStatement': BlockNode,
    'CallExpression': CallNode,
    'ConditionalExpression': ConditionalNode,
    'ContinueStatement': ContinueNode,
    'ExpressionStatement': ExpressionStatementNode,
    'ForInStatement': ForInNode,
    'ForOfStatement': ForOfNode,
    'ForStatement': ForNode,
    'FunctionDeclaration': FunctionDeclarationNode,
    'FunctionExpression': FunctionExpressionNode,
    'Identifier': IdentifierNode,
    'IfStatement': IfNode,
    'LabeledStatement': LabeledNode,
    'Literal': LiteralNode,
    'LogicalExpression': LogicalNode,
    'MemberExpression': MemberNode,
    'ObjectExpression': ObjectNode,
    'Program': ProgramNode,
    'PropertyExpression': PropertyNode,
    'ReturnStatement': ReturnNode,
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
    const node = toSemanticNode(expression, null, null, null, new Scope(null));
    node.handleDeclarations();
    node.updateAccess();
    return node;
}