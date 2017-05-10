var Helper = require('../Helper');

describe('Use literals instead of new callse', function() {
    it('should use literals', function() {
        Helper.assertMatch('transform/samples/UseLiterals', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});
