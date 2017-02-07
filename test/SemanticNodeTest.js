var assert = require('assert');
var recast = require('recast');
var node = require('../dist/SemanticNode');


describe('Semantic node test', function() {

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

    it('declaration writes', function() {
        var ast = recast.parse('function fn(){}').program;
        var semanticNode = node.semantic(ast);
        var varFn = semanticNode.scope.variables['fn'];
        assert.equal(varFn.reads.length, 0);
        assert.equal(varFn.writes.length, 1);
    });

    it('function and block scope vars', function() {
        var ast = recast.parse('while(1){let x; var y;}').program;
        var semanticNode = node.semantic(ast);
        var varX = semanticNode.scope.variables['x'];
        assert.equal(varX, void 0);

        var varY = semanticNode.scope.variables['y'];
        assert(varY);
    });

    it('foreach loop variable writes and reads', function() {
        var ast = recast.parse('for(var i1 in x){} for(let i2 in x){} for(i3 in x){}').program;
        var semanticNode = node.semantic(ast);
        var varI1 = semanticNode.scope.variables['i1'];
        assert.equal(varI1.reads.length, 0);
        assert.equal(varI1.writes.length, 1);

        var varI2 = semanticNode.scope.variables['i2'];
        assert.equal(varI2, void 0);

        var varI3 = semanticNode.scope.variables['i3'];
        assert.equal(varI3.reads.length, 0);
        assert.equal(varI3.writes.length, 1);
    });

    it('function parameter and foreach variable scopes', function() {
        var ast = recast.parse('for(let i2 in x){} for(i3 in x){} function fn(i4){}').program;
        var semanticNode = node.semantic(ast);

        assert(semanticNode.body[0].left.scope === semanticNode.body[0].body.scope);

        assert(semanticNode.body[1].left.scope === semanticNode.scope);

        assert(semanticNode.body[2].id.scope === semanticNode.scope);
        assert(semanticNode.body[2].params[0].scope === semanticNode.body[2].body.scope);
    });

    it('not every id is real', function() {
        var ast = recast.parse('var i = 0; i:while(1){continue i; break i;};(function i(){})').program;
        var semanticNode = node.semantic(ast);

        let varI = semanticNode.scope.get('i');
        assert.strictEqual(varI.reads.length, 0);
        assert.strictEqual(varI.writes.length, 1);
    });
});