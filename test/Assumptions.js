var Helper = require('./Helper');

describe('Assumption optimizations', function() {
    it('no native overwrite', function() {
        Helper.assertMatch('assumptions/noNativeOverwrites', {
            assumptions: {
                noNativeOverwrites: true,
                noGlobalPropertyOverwrites: true
            }
        });
    });

    it('global property overwrites', function() {
        Helper.assertMatch('assumptions/globalPropertyOverwrites', {
            assumptions: {
                noGlobalPropertyOverwrites: false
            }
        });
    });

    it('no global property reads', function() {
        Helper.assertMatch('assumptions/noGlobalPropertyReads', {
            assumptions: {
                noGlobalPropertyReads: true
            }
        });
    });
});