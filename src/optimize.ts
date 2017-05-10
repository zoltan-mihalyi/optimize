///<reference path="utils/Expression.ts"/>
import recast = require('recast');
import {semantic} from "./Nodes";
import {NodeVisitor, TrackingVisitor} from "./utils/NodeVisitor";

import CalculateArithmetic = require("./features/calculate/CalculateArithmetic");
import ReduceConditionals = require("./features/transform/ReduceConditionals");
import ReduceLogical = require("./features/transform/ReduceLogical");
import ReduceTailRecursion = require("./features/transform/ReduceTailRecursion");
import RemoveBlock = require("./features/transform/RemoveBlock");
import RemoveExpressionStatements = require("./features/transform/RemoveExpressionStatements");
import ResolvePropertyName = require("./features/calculate/ResolvePropertyName");
import ResolvePropertyAccess = require("./features/calculate/ResolvePropertyAccess");
import ResolveNativeFunctionCalls = require("./features/calculate/ResolveNativeFunctionCalls");
import ReduceSequenceExpression = require("./features/transform/ReduceSequenceExpression");
import UnrollForIn = require("./features/transform/UnrollForIn");
import InlineFunctionCall = require("./features/transform/InlineFunctionCall");
import RemoveUnused = require("./features/transform/RemoveUnused");
import SetParameterValues = require("./features/calculate/SetParameterValues");
import TrackValues = require("./features/calculate/TrackValues");
import UseLiterals = require("./features/transform/UseLiterals");

const nodeVisitor = new NodeVisitor();
ReduceConditionals(nodeVisitor);
ReduceLogical(nodeVisitor);
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
ReduceTailRecursion(trackingVisitor);
UseLiterals(trackingVisitor);

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