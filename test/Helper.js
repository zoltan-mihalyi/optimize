var fs = require('fs');
var optimize = require('../dist/optimize');
var assert = require('assert');

module.exports.assertMatch = function (filename, options) {
    var expected = fs.readFileSync(__dirname + '/samples/' + filename + '.optimized.js', 'UTF-8').replace(/\r/g, '');
    assert.equal(optimize(fs.readFileSync(__dirname + '/samples/' + filename + '.js', 'UTF-8'), options), expected);
};