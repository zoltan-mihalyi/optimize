var assert = require('assert');
var recast = require('recast');
var node = require('../dist/SemanticNode');


describe('Parse', function() {

    it('parse basic', function() {
        var ast = recast.parse('var a = 1;  function b (){console.log(a)}').program;
        var semanticNode = node.semantic(ast);

        assert(semanticNode instanceof node.ProgramNode);
        assert(semanticNode.body[1] instanceof node.FunctionDeclarationNode);
    });

    it('Hiding', function() {
        var ast = recast.parse('var a = 1, b = 1, c; function d (a) {var b=2; console.log(a, b, c, d); var c;}').program;
        var semanticNode = node.semantic(ast);
        var varA = semanticNode.scope.variables['a'];
        assert.strictEqual(varA.reads.length, 0);

        var varB = semanticNode.scope.variables['b'];
        assert.strictEqual(varB.reads.length, 0);

        var varC = semanticNode.scope.variables['c'];
        assert.strictEqual(varC.reads.length, 0);
    });

    it('Writes', function() {
        var ast = recast.parse('var a = 1, b = 2, c, d; b = 1; d = 1;').program;
        var semanticNode = node.semantic(ast);
        var varA = semanticNode.scope.variables['a'];
        assert.strictEqual(varA.reads.length, 0);
        assert.strictEqual(varA.writes.length, 1);

        var varB = semanticNode.scope.variables['b'];
        assert.strictEqual(varB.reads.length, 0);
        assert.strictEqual(varB.writes.length, 2);

        var varC = semanticNode.scope.variables['c'];
        assert.strictEqual(varC.writes.length, 0);

        var varD = semanticNode.scope.variables['d'];
        assert.strictEqual(varD.writes.length, 1);
    });

    it('Unknown variables are global', function() {
        var ast = recast.parse('function fn(){log(a)}').program;
        var semanticNode = node.semantic(ast);
        var varA = semanticNode.scope.variables['a'];
        assert(varA);
    });

    it('Parameter scope', function() {
        var ast = recast.parse('function fn(a){} (function(b){})').program;
        var semanticNode = node.semantic(ast);
        var outerVarA = semanticNode.scope.variables['a'];
        assert.equal(outerVarA, void 0);

        var outerVarB = semanticNode.scope.variables['b'];
        assert.equal(outerVarB, void 0);
    });

    it('Parameter writes', function() {
        var ast = recast.parse('function fn(a){log(a)} (function(b){})').program;
        var semanticNode = node.semantic(ast);
        var varA = semanticNode.body[0].body.scope.variables['a'];
        assert.equal(varA.reads.length, 1);
        assert.equal(varA.writes.length, 1);

        var varB = semanticNode.body[1].expression.body.scope.variables['b'];
        assert.equal(varB.reads.length, 0);
        assert.equal(varB.writes.length, 1);
    });

    it('arguments writes', function() {
        var ast = recast.parse('function fn(){}').program;
        var semanticNode = node.semantic(ast);
        var varArguments = semanticNode.body[0].body.scope.variables['arguments'];
        assert.equal(varArguments.reads.length, 0);
        assert.equal(varArguments.writes.length, 0);
    });
});