var Helper = require('./Helper');

describe('Remove blocks', function() {
    it('remove blocks with no block-scoped variables', function() {
        Helper.assertMatch('RemoveBlock');
    });
});