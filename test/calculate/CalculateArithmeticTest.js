var Helper = require('../Helper');

describe('Calculate arithmetic', function() {
    it('should calculate', function() {
        Helper.assertMatch('calculate/samples/CalculateArithmetic', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});