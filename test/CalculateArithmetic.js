var Helper = require('./Helper');

describe('Calculate arithmetic', function() {
    it('should calculate', function() {
        Helper.assertMatch('CalculateArithmetic', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});