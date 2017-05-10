var Helper = require('../Helper');

describe('Resolve native function calls', function() {
    it('resolve', function() {
        Helper.assertMatch('calculate/samples/ResolveNativeFunctionCalls', {
            assumptions: {
                noNativeOverwrites: true,
                noGlobalPropertyOverwrites: true
            }
        });
    });
});