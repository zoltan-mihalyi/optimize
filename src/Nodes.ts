///<reference path="utils/Expression.ts"/>
import Context from "./utils/Context";
import {SemanticNode} from "./node/SemanticNode";
import {ArrayNode} from "./node/ArrayNode";
import {FunctionDeclarationNode, FunctionExpressionNode, ArrowFunctionExpressionNode} from "./node/Functions";
import {AssignmentNode, UpdateNode} from "./node/Assignments";
import {BinaryNode, ConditionalNode, LogicalNode, UnaryNode} from "./node/Operators";
import {BlockComment, LineComment} from "./node/Comments";
import {BlockNode, ProgramNode} from "./node/Blocks";
import {BreakNode, ContinueNode, LabeledNode, ReturnNode} from "./node/JumpNodes";
import {CallNode, NewNode} from "./node/CallNodes";
import {CatchNode, ThrowNode, TryNode} from "./node/ExceptionHandling";
import {DoWhileNode, ForInNode, ForOfNode, ForNode, WhileNode} from "./node/Loops";
import {EmptyNode, ExpressionStatementNode, MemberNode, SequenceNode, ThisNode} from "./node/Others";
import {IdentifierNode} from "./node/IdentifierNode";
import {IfNode, SwitchCaseNode, SwitchStatementNode} from "./node/Branches";
import {LiteralNode} from "./node/Literal";
import {ObjectNode, PropertyNode} from "./node/Objects";
import {VariableDeclarationNode, VariableDeclaratorNode} from "./node/Variables";
import Scope = require("./tracking/Scope");

interface SemanticNodeConstructor {
    new(e:Expression, parent:SemanticNode, parentObj:any, property:string, scope:Scope, context:Context):SemanticNode;
}

const typeToNodeMap:{[type:string]:SemanticNodeConstructor} = {
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

export function toSemanticNode(expression:Expression, parent:SemanticNode, parentObject:any, parentProperty:string,
                               scope:Scope, context:Context):SemanticNode {

    let Node = typeToNodeMap[expression.type];
    /* istanbul ignore else */
    if (Node) {
        return new Node(expression, parent, parentObject, parentProperty, scope, context);
    } else {
        throw new Error('Unknown node:' + expression.type);
    }
}

export function semantic(expression:Expression, options:OptimizeOptions):SemanticNode {
    if ((expression as any).errors && (expression as any).errors.length) {
        throw (expression as any).errors[0];
    }
    const node = toSemanticNode(expression, null, null, null, Scope.ROOT_SCOPE, new Context(options));
    node.initialize();
    return node;
}