import {IdentifierNode} from "./IdentifierNode";
import {FunctionDeclarationNode, AbstractFunctionExpressionNode} from "./Functions";
import {BlockNode} from "./Blocks";
import {LabeledNode, BreakNode, ContinueNode, ReturnNode} from "./JumpNodes";
import {PropertyNode} from "./Objects";
import {UpdateNode, AssignmentNode} from "./Assignments";
import {VariableDeclaratorNode, VariableDeclarationNode} from "./Variables";
import {ForEachNode} from "./Loops";
import {MemberNode} from "./Others";
import {UnaryNode} from "./Operators";
import {LiteralNode} from "./Literal";
import {Comment} from "./Comments";

interface References {
    AbstractFunctionExpressionNode?:typeof AbstractFunctionExpressionNode;
    AssignmentNode?:typeof AssignmentNode;
    BlockNode?:typeof BlockNode;
    BreakNode?:typeof BreakNode;
    ContinueNode?:typeof ContinueNode;
    Comment?:typeof Comment;
    ForEachNode?:typeof ForEachNode;
    FunctionDeclarationNode?:typeof FunctionDeclarationNode;
    IdentifierNode?:typeof IdentifierNode;
    LabeledNode?:typeof LabeledNode;
    LiteralNode?:typeof LiteralNode;
    MemberNode?:typeof MemberNode;
    PropertyNode?:typeof PropertyNode;
    ReturnNode?:typeof ReturnNode;
    UnaryNode?:typeof UnaryNode;
    UpdateNode?:typeof UpdateNode;
    VariableDeclarationNode?:typeof VariableDeclarationNode;
    VariableDeclaratorNode?:typeof VariableDeclaratorNode;
}

const references:References = {};

export = references;