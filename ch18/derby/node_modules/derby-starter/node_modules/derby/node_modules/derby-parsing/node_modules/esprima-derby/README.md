**esprima-derby** ([esprima.org](http://esprima.org), BSD license)

This fork of Esprima is modified to parse expressions in Derby templates.

Parsing of statements and other non-expression language features has been removed. With the exception of `this`, `typeof`, `instanceof`, `in`, and `new`, ECMAScript keywords have been removed. Expressions such as `class` and `for` are parsed as identifiers instead of as keywords.

Instead of parsing it as an identifier, `undefined` is parsed as a literal. It works the same way as `null` parsing.

Identifiers may start with an at sign (`@`) or hash (`#`) in addition to the standard set of starting characters (underscore, dollar sign, A-Z, a-z, and ISO 8859-1 or Unicode characters). These characters are not accepted as subsequent characters, which may only be the standard set (underscore, dollar sign, A-Z, a-z, ISO 8859-1 or Unicode characters, and 0-9).

For more information, see [derbyjs.com](http://derbyjs.com) and [esprima.org](http://esprima.org).
