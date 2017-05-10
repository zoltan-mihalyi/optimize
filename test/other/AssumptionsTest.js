var Helper = require('../Helper');

describe('Assumption optimizations', function() {
    it('no native overwrite', function() {
        Helper.assertMatch('other/samples/assumptions/noNativeOverwrites', {
            assumptions: {
                noNativeOverwrites: true,
                noGlobalPropertyOverwrites: true
            }
        });
    });

    it('global property overwrites', function() {
        Helper.assertMatch('other/samples/assumptions/globalPropertyOverwrites', {
            assumptions: {
                noGlobalPropertyOverwrites: false
            }
        });
    });

    it('no global property reads', function() {
        Helper.assertMatch('other/samples/assumptions/noGlobalPropertyReads', {
            assumptions: {
                noGlobalPropertyReads: true
            }
        });
    });
});