var Helper = require('../Helper');

describe('Unroll for...in loops', function() {
    it('should unroll', function() {
        Helper.assertMatch('transform/samples/UnrollForIn', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});
