var assert = require('assert');
var value = require('../dist/Value');
var PrimitiveValue = value.PrimitiveValue;
var ReferenceValue = value.ReferenceValue;
var FiniteSetOfValues = value.FiniteSetOfValues;
var unknown = value.unknown;

describe('KnownValue', function() {
    it('test or with KnownValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(2);
        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with ReferenceValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new ReferenceValue();

        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(2);
        var value3 = new PrimitiveValue(3);

        var valueSet = new FiniteSetOfValues([value2, value3]);
        assert.deepEqual(value1.or(valueSet), new FiniteSetOfValues([value2, value3, value1]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new PrimitiveValue(1);
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new PrimitiveValue(1);

        assert.deepEqual(value1.map(mapper), new PrimitiveValue(2));
    });

    it('test product with KnownValue', function() {
        var value1 = new PrimitiveValue(2);
        var value2 = new PrimitiveValue(3);

        assert.deepEqual(value1.product(value2, biMapper), new PrimitiveValue(6));
    });

    it('test product with ReferenceValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new ReferenceValue();

        assert.deepEqual(value1.product(value2, biMapper), new PrimitiveValue('1, object'));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new PrimitiveValue(3);
        var value2 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new PrimitiveValue(3), new PrimitiveValue(6)]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new PrimitiveValue(3);

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });
});

describe('ReferenceValue', function() {
    it('test or with KnownValue', function() {
        var value1 = new ReferenceValue();
        var value2 = new PrimitiveValue(2);
        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with ReferenceValue', function() {
        var value1 = new ReferenceValue();
        var value2 = new ReferenceValue();

        assert.deepEqual(value1.or(value2), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new ReferenceValue();
        var value2 = new PrimitiveValue(2);
        var value3 = new PrimitiveValue(3);

        var valueSet = new FiniteSetOfValues([value2, value3]);
        assert.deepEqual(value1.or(valueSet), new FiniteSetOfValues([value2, value3, value1]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new ReferenceValue();
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new ReferenceValue();

        assert.deepEqual(value1.map(mapper), new PrimitiveValue('object+1'));
    });

    it('test product with KnownValue', function() {
        var value1 = new ReferenceValue();
        var value2 = new PrimitiveValue(2);

        assert.deepEqual(value1.product(value2, biMapper), new PrimitiveValue('object, 2'));
    });

    it('test product with ReferenceValue', function() {
        var value1 = new ReferenceValue();
        var value2 = new ReferenceValue();

        assert.deepEqual(value1.product(value2, biMapper), new PrimitiveValue('object, object'));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new ReferenceValue();
        var value2 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new PrimitiveValue('object, 1'), new PrimitiveValue('object, 2')]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new ReferenceValue();

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });
});

describe('FiniteSetOfValues', function() {
    it('test or with KnownValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(2);
        var valueSet = new FiniteSetOfValues([value1, value2]);
        var value3 = new PrimitiveValue(3);
        assert.deepEqual(valueSet.or(value3), new FiniteSetOfValues([value1, value2, value3]));
    });

    it('test or with NaN KnownValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(0 / 0);
        var valueSet = new FiniteSetOfValues([value1, value2]);
        var value3 = new PrimitiveValue(0 / 0);
        assert.deepEqual(valueSet.or(value3), new FiniteSetOfValues([value1, value2]));
    });

    it('test or with ReferenceValue', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(2);
        var valueSet = new FiniteSetOfValues([value1, value2]);
        var value3 = new ReferenceValue();

        assert.deepEqual(valueSet.or(value3), new FiniteSetOfValues([value1, value2, value3]));
    });

    it('test or with FiniteSetOfValues', function() {
        var value1 = new PrimitiveValue(1);
        var value2 = new PrimitiveValue(2);
        var value3 = new PrimitiveValue(3);
        var value4 = new PrimitiveValue(4);
        var value5 = new PrimitiveValue(5);

        var valueSet1 = new FiniteSetOfValues([value1, value2]);
        var valueSet2 = new FiniteSetOfValues([value3, value4, value5]);
        assert.deepEqual(valueSet1.or(valueSet2), new FiniteSetOfValues([value1, value2, value3, value4, value5]));
    });

    it('test or with UnknownValue', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);
        assert.deepEqual(value1.or(unknown), unknown);
    });

    it('test map', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);

        assert.deepEqual(value1.map(mapper), new FiniteSetOfValues([new PrimitiveValue(2), new PrimitiveValue(3)]));
    });

    it('test product with KnownValue', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);
        var value2 = new PrimitiveValue(3);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new PrimitiveValue(3), new PrimitiveValue(6)]));
    });

    it('test product with ReferenceValue', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);
        var value2 = new ReferenceValue();

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([new PrimitiveValue('1, object'), new PrimitiveValue('2, object')]));
    });

    it('test product with FiniteSetOfValues', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);
        var value2 = new FiniteSetOfValues([new PrimitiveValue(3), new PrimitiveValue(4), new PrimitiveValue(5)]);

        assert.deepEqual(value1.product(value2, biMapper), new FiniteSetOfValues([
            new PrimitiveValue(3),
            new PrimitiveValue(4),
            new PrimitiveValue(5),
            new PrimitiveValue(6),
            new PrimitiveValue(8),
            new PrimitiveValue(10),
        ]));
    });

    it('test product with UnknownValue', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(1), new PrimitiveValue(2)]);

        assert.deepEqual(value1.product(unknown, biMapper), unknown);
    });

    it('test reduction to KnownValue', function() {
        var value1 = new FiniteSetOfValues([new PrimitiveValue(null), new PrimitiveValue(0)]);

        assert.deepEqual(value1.map(mapper), new PrimitiveValue(1));
    });
});


function mapper(x) {
    if (x instanceof PrimitiveValue) {
        return new PrimitiveValue(x.value + 1);
    } else if (x instanceof ReferenceValue) {
        return new PrimitiveValue('object+1');
    }
}

function biMapper(x, y) {
    if (x instanceof PrimitiveValue) {
        if (y instanceof PrimitiveValue) {
            return new PrimitiveValue(x.value * y.value);
        } else if (y instanceof ReferenceValue) {
            return new PrimitiveValue(x.value + ', object');
        }
    } else if (x instanceof ReferenceValue) {
        if (y instanceof PrimitiveValue) {
            return new PrimitiveValue('object, ' + y.value);
        } else if (y instanceof ReferenceValue) {
            return new PrimitiveValue('object, object');
        }
    }
}