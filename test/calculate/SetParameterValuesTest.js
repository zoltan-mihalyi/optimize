var Helper = require('../Helper');

describe('Set parameter values', function() {
    it('should set values', function() {
        Helper.assertMatch('calculate/samples/SetParameterValues', {
            assumptions: {
                //noGlobalPropertyOverwrites: true
            }
        });
    });
});