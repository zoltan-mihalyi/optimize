var Helper = require('./Helper');

describe('Preserve comments', function() {
    it('should preserve comments', function() {
        Helper.assertMatch('PreserveComments', {
            assumptions: {
                noGlobalPropertyOverwrites: true
            }
        });
    });
});