var Helper = require('../Helper');

describe('Resolve unused variables and function declarations', function() {
    it('should remove', function() {
        Helper.assertMatch('RemoveUnused');
    });
});
