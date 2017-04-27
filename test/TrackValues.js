var Helper = require('./Helper');

describe('Track values', function() {
    it('should track variables', function() {
        Helper.assertMatch('TrackValues-variables');
    });
    it('should track objects', function() {
        Helper.assertMatch('TrackValues-objects', {assumptions: {noNativeOverwrites: true}});
    });
    it('should inside functions with the values in outer functions', function() {
        Helper.assertMatch('TrackValues-inside');
    });
});