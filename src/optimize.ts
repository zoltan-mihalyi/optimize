///<reference path="Expression.ts"/>
import recast = require('recast');
import {semantic} from "./Nodes";
import NodeVisitor = require("./NodeVisitor");

import CalculateArithmetic = require("./features/CalculateArithmetic");
import ReduceConditionals = require("./features/ReduceConditionals");
import ReduceLogical = require("./features/ReduceLogical");
import ReduceTailRecursion = require("./features/ReduceTailRecursion");
import RemoveBlock = require("./features/RemoveBlock");
import RemoveExpressionStatements = require("./features/RemoveExpressionStatements");
import ResolvePropertyName = require("./features/ResolvePropertyName");
import ResolvePropertyAccess = require("./features/ResolvePropertyAccess");
import ResolveNativeFunctionCalls = require("./features/ResolveNativeFunctionCalls");
import ReduceSequenceExpression = require("./features/ReduceSequenceExpression");
import UnrollForIn = require("./features/UnrollForIn");
import InlineFunctionCall = require("./features/InlineFunctionCall");
import RemoveUnused = require("./features/RemoveUnused");
import TrackValues = require("./features/TrackValues");

const nodeVisitor = new NodeVisitor();
CalculateArithmetic(nodeVisitor);
ReduceConditionals(nodeVisitor);
ReduceLogical(nodeVisitor);
ReduceTailRecursion(nodeVisitor);
RemoveBlock(nodeVisitor);
RemoveExpressionStatements(nodeVisitor);
ResolvePropertyName(nodeVisitor);
ResolvePropertyAccess(nodeVisitor);
ResolveNativeFunctionCalls(nodeVisitor);
ReduceSequenceExpression(nodeVisitor);
UnrollForIn(nodeVisitor);
InlineFunctionCall(nodeVisitor);
RemoveUnused(nodeVisitor);
TrackValues(nodeVisitor);

export = function (code:string):string {
    let ast:Expression = recast.parse(code).program;

    let changed = false;
    let updated = true;

    let semanticNode = semantic(ast);
    while (updated) {
        if (changed) {
            ast = semanticNode.toAst();
            semanticNode = semantic(ast);
        } else {
            semanticNode.clearUpdated();
        }

        semanticNode.walk(node => nodeVisitor.callAll(node));
        changed = semanticNode.isChanged();
        updated = semanticNode.isUpdated();
    }

    return recast.print(ast, {
        lineTerminator: '\n'
    }).code;
};