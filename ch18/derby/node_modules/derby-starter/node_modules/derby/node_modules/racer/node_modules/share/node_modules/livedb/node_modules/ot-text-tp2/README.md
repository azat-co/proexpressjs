# TP2 Text OT type

This is an implementation of OT for text which implements [transform property
2](http://en.wikipedia.org/wiki/Operational_transformation#Convergence_properties)
through the use of tombstones. As such, this data structure can be used in
peer-to-peer situations (with concurrency control algorithms which do not have
a single source of truth).

This code following this spec from lightwave:
http://code.google.com/p/lightwave/source/browse/trunk/experimental/ot/README

Documents are a string with tombstones inserted throughout. For example, 'some
', (2 tombstones), 'string'. Tombstones indicate positions where characters
once existed. They are important for many parties to agree on convergence.

This is encoded in a document as ['some ', (2 tombstones), 'string']
(It should be encoded as {s:'some string', t:[5, -2, 6]} because thats
faster in JS, but its not.)

Just like in the 'normal' [plaintext type](/ottypes/text), Ops are lists of
components which iterate over the whole document.

Components are either:

Compoent   | Description
---------- | ------------
`N`        | Skip N characters in the original document
`{i:'str'}`| Insert 'str' at the current position in the document
`{i:N}`    | Insert N tombstones at the current position in the document
`{d:N}`    | Delete (tombstone) N characters at the current position in the document

For example:

```
[3, {i:'hi'}, 5, {d:8}]
```

Snapshots are lists with characters and tombstones. Characters are stored in strings
and adjacent tombstones are flattened into numbers.

Eg, the document: 'Hello .....world' ('.' denotes tombstoned (deleted) characters)
would be represented by a document snapshot of ['Hello ', 5, 'world']


---

# License

All code contributed to this repository is licensed under the standard MIT license:

Copyright 2011 ottypes library contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following condition:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

