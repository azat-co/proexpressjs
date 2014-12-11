var expect = require('expect.js');
var racer = require('racer');
var plugin = require('../index');

describe('bundle', function() {

  it('adds a bundle method to stores', function() {
    var store = racer.createStore();
    expect(store.bundle).equal(undefined);
    racer.use(plugin);
    expect(store.bundle).to.be.a('function');
  });

});
