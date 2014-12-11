describe "ascii-json", ->

  asciiJSON = require('../lib/ascii-json')

  it "should detect non-ASCII string", ->

    asciiJSON.isAscii('this is all ASCII').should.be.true
    asciiJSON.isAscii('this is not 에스키').should.be.false

  it "should escape non-ASCII string to ASCII-only string", ->

    escaped = asciiJSON.escapeNonAsciis('this is not 에스키')
    asciiJSON.isAscii(escaped).should.be.true

  it "should stringify objects with non-ASCII string into ASCII only JSON", ->

    troublemaker =
      ascii: "hello world"
      nonascii: "안녕하세요"

    asciiOnly = asciiJSON.stringify(troublemaker)
    asciiJSON.isAscii(asciiOnly).should.be.true
    restored = asciiJSON.parse(asciiOnly)
    restored.should.eql(troublemaker)
