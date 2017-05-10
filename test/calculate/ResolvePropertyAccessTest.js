var Helper = require('../Helper');

describe('Resolve property access', function() {
    it('should remove known properties', function() {
        Helper.assertMatch('calculate/samples/ResolvePropertyAccess', {
            assumptions: {
                noNativeOverwrites: true,
                noGlobalPropertyOverwrites: true
            }
        });
    });
});
