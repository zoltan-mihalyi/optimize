///<reference path="Expression.ts"/>
import recast = require('recast');
import {semantic} from "./SemanticNode";
import Scope = require("./Scope");
import NodeVisitor = require("./NodeVisitor");

import CalculateArithmetic = require("./features/CalculateArithmetic");
import ReduceConditionals = require("./features/ReduceConditionals");
import ReduceLogical = require("./features/ReduceLogical");
import ReduceTailRecursion = require("./features/ReduceTailRecursion");
import RemoveBlock = require("./features/RemoveBlock");
import RemoveExpressionStatements = require("./features/RemoveExpressionStatements");

const nodeVisitor = new NodeVisitor();
CalculateArithmetic(nodeVisitor);
ReduceConditionals(nodeVisitor);
ReduceLogical(nodeVisitor);
ReduceTailRecursion(nodeVisitor);
RemoveBlock(nodeVisitor);
RemoveExpressionStatements(nodeVisitor);

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