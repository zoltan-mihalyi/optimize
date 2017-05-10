var assert = require('assert');
var optimize = require('../../dist/optimize');

describe('Calculated value bubbling', function() {
    it('object value can be calculated after property is calculated', function() {
        var options = {assumptions: {noNativeOverwrites: true}};
        assert.equal(optimize('log(typeof ({x:{}.toString}).x);', options), 'log("function");');

        var cannotOptimize = 'log(typeof ({x:{}.toString, y:console.log("y")}).x);';
        assert.equal(optimize(cannotOptimize, options), cannotOptimize);
    });
});