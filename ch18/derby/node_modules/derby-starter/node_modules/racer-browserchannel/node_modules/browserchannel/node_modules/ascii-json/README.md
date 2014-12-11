Generates ASCII-only JSON with escaped non-ASCII chracters.

## Install

        npm install ascii-json

## Examples

        var asciiJSON = require('ascii-json');

See if a string is all ASCII or not

        asciiJSON.isAscii("this is all ASCII"); // true
        asciiJSON.isAscii("this is not 에스키"); // false

Escape non-ASCII strings

        console.log(asciiJSON.escapeNonAsciis('this is not 에스키'));

        // output: this is not \uc5d0\uc2a4\ud0a4"

Stringify object with non-ASCII property value

        troublemaker = {
          ascii: "hello world",
          nonascii: "안녕하세요"
        };
        asciiOnly = asciiJSON.stringify(troublemaker);
        console.log(asciiOnly);

        // output: {"ascii":"hello world","nonascii":"\uc548\ub155\ud558\uc138\uc694"}

