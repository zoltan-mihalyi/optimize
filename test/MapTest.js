var assert = require('assert');
var Map = require('../dist/Map');

describe('Map', function() {
    it('map set and get', function() {
        var map = new Map();
        var key = {};
        map.set(key, 12);
        assert(map.get(key), 12);
    });

    it('map set existing key', function() {
        var map = new Map();
        var key = {};
        map.set(key, 12);
        assert.throws(function() {
            map.set(key, 13);
        });
    });

    it('map get non-existing key', function() {
        var map = new Map();
        assert.throws(function() {
            map.get({});
        });
    });

    it('remove non-existing', function() {
        var map = new Map();
        map.set(1, 2);
        map.remove(1);
        map.remove(1);
    });
});