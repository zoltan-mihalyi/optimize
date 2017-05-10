var Helper = require('../Helper');

describe('Preserve comments', function() {
    it('should preserve comments', function() {
        Helper.assertMatch('other/samples/PreserveComments', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});