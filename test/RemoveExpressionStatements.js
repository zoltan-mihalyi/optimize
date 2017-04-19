var Helper = require('./Helper');

describe('Remove expression statements', function() {
    describe('Remove statements', function() {
        it('should remove unnecessary expression statements', function() {
            Helper.assertMatch('RemoveExpressionStatements', {
                assumptions: {
                    noGlobalPropertyOverwrites: true
                }
            });
        });
    });
});