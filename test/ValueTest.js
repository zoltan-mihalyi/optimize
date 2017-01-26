var assert = require('assert');
var value = require('../dist/Value');
var KnownValue = value.KnownValue;
var ObjectValue = value.ObjectValue;
var FiniteSetOfValues = value.FiniteSetOfValues;
var unknown = value.unknown;

describe('KnownValue', function() {
    it('test or with KnownValue', function() {
        var value1 = new KnownValue(1);
        var value2 = new KnownValue(2);
        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with ObjectValue', function() {
        var value1 = new KnownValue(1);
        var value2 = new ObjectValue(1);

        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new KnownValue(1);
        var value2 = new KnownValue(2);
        var value3 = new KnownValue(3);

        var valueSet = new FiniteSetOfValues([value2, value3]);
        assert.deepEqual(value1.or(valueSet), new FiniteSetOfValues([value2, value3, value1]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new KnownValue(1);
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new KnownValue(1);

        assert.deepEqual(value1.map(mapper), new KnownValue(2));
    });

    it('test product with KnownValue', function() {
        var value1 = new KnownValue(2);
        var value2 = new KnownValue(3);

        assert.deepEqual(value1.product(value2, biMapper), new KnownValue(6));
    });

    it('test product with ObjectValue', function() {
        var value1 = new KnownValue(1);
        var value2 = new ObjectValue(1);

        assert.deepEqual(value1.product(value2, biMapper), new KnownValue('1, object'));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new KnownValue(3);
        var value2 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new KnownValue(3), new KnownValue(6)]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new KnownValue(3);

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });
});

describe('ObjectValue', function() {
    it('test or with KnownValue', function() {
        var value1 = new ObjectValue(1);
        var value2 = new KnownValue(2);
        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with ObjectValue', function() {
        var value1 = new ObjectValue(1);
        var value2 = new ObjectValue(2);

        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new ObjectValue(1);
        var value2 = new KnownValue(2);
        var value3 = new KnownValue(3);

        var valueSet = new FiniteSetOfValues([value2, value3]);
        assert.deepEqual(value1.or(valueSet), new FiniteSetOfValues([value2, value3, value1]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new ObjectValue(1);
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new ObjectValue(1);

        assert.deepEqual(value1.map(mapper), new KnownValue('object+1'));
    });

    it('test product with KnownValue', function() {
        var value1 = new ObjectValue(1);
        var value2 = new KnownValue(2);

        assert.deepEqual(value1.product(value2, biMapper), new KnownValue('object, 2'));
    });

    it('test product with ObjectValue', function() {
        var value1 = new ObjectValue(1);
        var value2 = new ObjectValue(1);

        assert.deepEqual(value1.product(value2, biMapper), new KnownValue('object, object'));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new ObjectValue(1);
        var value2 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new KnownValue('object, 1'), new KnownValue('object, 2')]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new ObjectValue(3);

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });
});

describe('FiniteSetOfValues', function() {
    it('test or with KnownValue', function() {
        var value1 = new KnownValue(1);
        var value2 = new KnownValue(2);
        var valueSet = new FiniteSetOfValues([value1, value2]);
        var value3 = new KnownValue(3);
        assert.deepEqual(valueSet.or(value3), new FiniteSetOfValues([value1, value2, value3]));
    });

    it('test or with ObjectValue', function() {
        var value1 = new KnownValue(1);
        var value2 = new KnownValue(2);
        var valueSet = new FiniteSetOfValues([value1, value2]);
        var value3 = new ObjectValue(2);

        assert.deepEqual(valueSet.or(value3), new FiniteSetOfValues([value1, value2, value3]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new KnownValue(1);
        var value2 = new KnownValue(2);
        var value3 = new KnownValue(3);
        var value4 = new KnownValue(4);
        var value5 = new KnownValue(5);

        var valueSet1 = new FiniteSetOfValues([value1, value2]);
        var valueSet2 = new FiniteSetOfValues([value3, value4, value5]);
        assert.deepEqual(valueSet1.or(valueSet2), new FiniteSetOfValues([value1, value2, value3, value4, value5]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);

        assert.deepEqual(value1.map(mapper), new FiniteSetOfValues([new KnownValue(2), new KnownValue(3)]));
    });

    it('test product with KnownValue', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);
        var value2 = new KnownValue(3);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new KnownValue(3), new KnownValue(6)]));
    });

    it('test product with ObjectValue', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);
        var value2 = new ObjectValue(1);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new KnownValue('1, object'), new KnownValue('2, object')]));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);
        var value2 = new FiniteSetOfValues([new KnownValue(3), new KnownValue(4), new KnownValue(5)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([
            new KnownValue(3),
            new KnownValue(4),
            new KnownValue(5),
            new KnownValue(6),
            new KnownValue(8),
            new KnownValue(10),
        ]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(1), new KnownValue(2)]);

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });

    it('test reduction to KnownValue', function() {
        var value1 = new FiniteSetOfValues([new KnownValue(null), new KnownValue(0)]);

        assert.deepEqual(value1.map(mapper), new KnownValue(1));
    });
});


function mapper(x) {
    if (x instanceof KnownValue) {
        return new KnownValue(x.value + 1);
    } else if (x instanceof ObjectValue) {
        return new KnownValue('object+1');
    }
}

function biMapper(x, y) {
    if (x instanceof KnownValue) {
        if (y instanceof KnownValue) {
            return new KnownValue(x.value * y.value);
        } else if (y instanceof ObjectValue) {
            return new KnownValue(x.value + ', object');
        }
    } else if (x instanceof ObjectValue) {
        if (y instanceof KnownValue) {
            return new KnownValue('object, ' + y.value);
        } else if (y instanceof ObjectValue) {
            return new KnownValue('object, object');
        }
    }
}