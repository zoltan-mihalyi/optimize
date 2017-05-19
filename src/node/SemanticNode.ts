import Scope = require("../tracking/Scope");
import Context from "../utils/Context";
import {toSemanticNode} from "../Nodes";
import {createUnusedName, isFunctionNode} from "../utils/Utils";
import {FunctionNode} from "./Functions";
import {Comment} from "./Comments";
import {TrackingVisitor} from "../utils/NodeVisitor";
import {VariableDeclaratorNode} from "./Variables";
import Later = require("./Later");

import recast = require("recast");
import Map = require("../utils/Map");
import EvaluationState = require("../tracking/EvaluationState");

const builders = recast.types.builders;

export abstract class SemanticNode {
    readonly type:string;
    readonly scope:Scope;
    private readonly childKeys:string[] = [];
    private changed:boolean = false;
    private updated:boolean = false;
    private original:Expression;
    private comments?:Comment[];

    constructor(source:Expression,
                public readonly parent:SemanticNode,
                private readonly parentObject:{ [idx:string]:any },
                protected readonly parentProperty:string,
                scope:Scope,
                readonly context:Context) {

        scope = this.createSubScopeIfNeeded(scope);
        this.scope = scope;

        this.original = source.original;
        for (let childKey of Object.keys(source)) {
            this.childKeys.push(childKey);
            let sourceChild:any = (source as any)[childKey];
            if (Array.isArray(sourceChild)) {

                const semanticArray = [];
                for (let i = 0; i < sourceChild.length; i++) {
                    semanticArray.push(toSemanticNode(sourceChild[i], this, semanticArray, i + '', scope, context));
                }

                (this as any)[childKey] = semanticArray;
            } else if (sourceChild && sourceChild.type) {
                (this as any)[childKey] = toSemanticNode(sourceChild, this, this, childKey, scope, context);
            } else {
                (this as any)[childKey] = sourceChild;
            }
        }
    }

    getEnclosingFunction():FunctionNode {
        return this.getParent<FunctionNode>(isFunctionNode);
    }

    getParent(predicate:(node:SemanticNode) => boolean):SemanticNode;
    getParent<T extends SemanticNode>(predicate:(node:SemanticNode) => node is T):T;
    getParent<T extends SemanticNode>(predicate:(node:SemanticNode) => node is T):T {
        let parent = this.parent;
        while (parent) {
            if (predicate(parent)) {
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
                result[childKey] = childNode.map(node => node.toAst(transform));
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

        const nodes:SemanticNode[] = expressions.map(e => {
            return toSemanticNode(e, this.parent, this.parentObject, this.parentProperty, this.scope, this.context);
        });

        const removedCommentsByOriginal:Map<Expression, Comment> = new Map<Expression, Comment>();
        this.walk((node:SemanticNode) => {
            if (node instanceof Later.Comment) {
                removedCommentsByOriginal.set(node.original, node);
            }
        });

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.walk((node:SemanticNode) => {
                if (node instanceof Later.Comment) {
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

        let sourceCode = recast.print(this.toAst()).code;
        let targetCode = expressions.map(e => recast.print(e).code).join(',');
        console.log('REPLACED ' + sourceCode + ' WITH ' + targetCode);

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
        return this.getParent(predicate) !== null;
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

    walk<T>(before:(node:this) => T):T {
        const wasChangedBefore = this.isChanged();
        let result:T = before(this);
        if (!wasChangedBefore && this.isChanged()) {
            return;
        }
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
                    const lengthBefore = sub.length;
                    let result:T = (sub[j] as SemanticNode).walk(before);
                    if (result) {
                        return result;
                    }
                    j -= lengthBefore - sub.length;
                }
            }
        }
    }

    initialize() {
        this.walk(node => node.handleDeclarationsForNode());
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

    getDeclarations():Expression[] {
        if (!(this instanceof Later.BlockNode)) {
            return [];
        }
        const enclosingFunction = this.getEnclosingFunction();
        const names:string[] = [];
        this.walk((node:SemanticNode) => {
            if (node instanceof Later.FunctionDeclarationNode) {
                if (node.getEnclosingFunction() === enclosingFunction) {
                    names.push(node.id.name);
                }
            } else if (node instanceof Later.VariableDeclarationNode && !node.isBlockScoped()) {
                if (node.getEnclosingFunction() === enclosingFunction) {
                    const declarations:VariableDeclaratorNode[] = node.declarations;
                    for (let i = 0; i < declarations.length; i++) {
                        names.push(declarations[i].id.name);
                    }
                }
            }
        });
        return names.map(name => {
            return builders.variableDeclaration('var', [builders.variableDeclarator(builders.identifier(name), null)]);
        });
    }

    createUnusedLabel():string {
        return createUnusedName('x', name => {
            return this.contains(node => node instanceof Later.LabeledNode && node.label.name === name);
        });
    }

    track(state:EvaluationState, visitor:TrackingVisitor) {
        this.onTrack(state, visitor);
        visitor.callAll(this, state);
        this.afterTrack(state);
    }

    protected markChanged() {
        if (this.parent) {
            this.parent.markChanged();
        }
        this.changed = true;
        this.updated = true;
    }

    markUpdated() {
        if (this.parent) {
            this.parent.markUpdated();
        }
        this.updated = true;
    }

    protected handleDeclarationsForNode() {
    }

    protected updateAccessForNode() {
    }

    protected createSubScopeIfNeeded(scope:Scope):Scope {
        return scope;
    }
    protected afterTrack(state:EvaluationState) {
    }

    protected abstract onTrack(state:EvaluationState, visitor:TrackingVisitor):void;

}