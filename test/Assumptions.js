var Helper = require('./Helper');

describe('No native overwrites', function() {
    it('should do further optimizations', function() {
        Helper.assertMatch('assumptions/noNativeOverwrites', {
            assumptions: {
                noNativeOverwrites: true
            }
        });
    });
});