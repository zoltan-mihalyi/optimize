///<reference path="Expression.ts"/>
import recast = require('recast');
import {semantic} from "./Nodes";
import {NodeVisitor, TrackingVisitor} from "./NodeVisitor";

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
import SetParameterValues = require("./features/SetParameterValues");
import TrackValues = require("./features/TrackValues");

const nodeVisitor = new NodeVisitor();
ReduceConditionals(nodeVisitor);
ReduceLogical(nodeVisitor);
ReduceTailRecursion(nodeVisitor);
RemoveBlock(nodeVisitor);
RemoveExpressionStatements(nodeVisitor);
ReduceSequenceExpression(nodeVisitor);
InlineFunctionCall(nodeVisitor);
RemoveUnused(nodeVisitor);

const trackingVisitor = new TrackingVisitor();
TrackValues(nodeVisitor, trackingVisitor); //todo nodevisitor constructor param?
CalculateArithmetic(trackingVisitor);
ResolveNativeFunctionCalls(trackingVisitor);
ResolvePropertyAccess(trackingVisitor);
ResolvePropertyName(trackingVisitor);
UnrollForIn(trackingVisitor);
SetParameterValues(trackingVisitor);

function createOptions(opts:OptionalOptimizeOptions):OptimizeOptions {
    return {
        assumptions: createAssumptionOptions(opts && opts.assumptions)
    };
}

function createAssumptionOptions(assumptions:OptionalAssumptionOptions):AssumptionOptions {
    if (!assumptions) {
        assumptions = {};
    }
    return {
        noNativeOverwrites: !!(assumptions.noNativeOverwrites),
        noGlobalPropertyOverwrites: !!(assumptions.noGlobalPropertyOverwrites),
        noGlobalPropertyReads: !!(assumptions.noGlobalPropertyReads)
    };
}

export = function (code:string, opts?:OptionalOptimizeOptions):string {
    const options:OptimizeOptions = createOptions(opts);
    let ast:Expression = recast.parse(code).program;

    let changed = false;
    let updated = true;

    let semanticNode = semantic(ast, options);
    while (updated) {
        if (changed) {
            ast = semanticNode.toAst();
            semanticNode = semantic(ast, options);
        } else {
            semanticNode.clearUpdated();
        }

        nodeVisitor.callStart(semanticNode);
        semanticNode.walk(node => nodeVisitor.callAll(node));
        nodeVisitor.callEnd(semanticNode);
        changed = semanticNode.isChanged();
        updated = semanticNode.isUpdated();
    }

    return recast.print(ast, {
        lineTerminator: '\n'
    }).code;
};