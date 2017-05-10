var fs = require('fs');
var optimize = require('../dist/optimize');
var assert = require('assert');

module.exports.assertMatch = function (filename, options) {
    var prefix = __dirname + '/' + filename;
    var expected = fs.readFileSync(prefix + '.optimized.js', 'UTF-8').replace(/\r/g, '');
    assert.equal(optimize(fs.readFileSync(prefix + '.js', 'UTF-8'), options), expected);
};