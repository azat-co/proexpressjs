var assert = require('assert');
var connector = require('../');

describe('loopback-connector', function() {
  it('exports Connector', function() {
    assert(connector.Connector);
  });

  it('exports SqlConnector', function() {
    assert(connector.SqlConnector);
  });
});
