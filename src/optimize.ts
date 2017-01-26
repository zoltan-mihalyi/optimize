///<reference path="Expression.ts"/>
import recast = require('recast');
import {semantic} from "./SemanticNode";
import Scope = require("./Scope");
export = function (code:string):string {
    let ast:Expression = recast.parse(code).program;

    let semanticNode = semantic(ast);
    ast = semanticNode.toAst();

    return recast.print(ast, {
        lineTerminator: '\n'
    }).code;
};