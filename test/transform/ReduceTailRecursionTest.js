var Helper = require('../Helper');

describe('Reduce tail recursion', function() {
    it('should reduce tail recursion', function() {
        Helper.assertMatch('transform/samples/ReduceTailRecursion', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});