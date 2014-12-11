var parse = require('./parse');

module.exports = {
  parse: parse
, unescapeEntities: unescapeEntities
, isConditionalComment: isConditionalComment
, trimLeading: trimLeading
, trimText: trimText
, trimTag: trimTag
, minify: minify
};

var replaceEntity;
if (typeof document !== 'undefined') {
  var entityContainer = document.createElement('div');
  replaceEntity = function(match) {
    // This use of innerHTML is only safe because the entity regular expression
    // is sufficiently restrictive. Doing this with un-validated HTML would
    // potentially introduce vulnerabilities
    entityContainer.innerHTML = match;
    return entityContainer.textContent || entityContainer.innerText;
  };
} else {
  // Named character references from:
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/entities.json
  // 
  // Only include this reference on the server, since it is a pretty large file,
  // and we can use the browser's parser instead
  var _require = require;
  var entities = _require('./entities.json');
  replaceEntity = function(match) {
    var named = entities[match];
    if (named) return named.characters;
    if (match.charAt(1) !== '#') {
      throw new Error('Unrecognized character reference: ' + match);
    }
    var charCode = (match.charAt(2) === 'x' || match.charAt(2) === 'X') ?
      parseInt(match.slice(3, -1), 16) :
      parseInt(match.slice(2, -1), 10);
    return String.fromCharCode(charCode);
  };
}
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#character-references
function unescapeEntities(html) {
  return html.replace(/&#?[A-Za-z0-9]+;/g, replaceEntity);
}

// Assume any HTML comment that starts with `<!--[` or ends with `]-->`
// is a conditional comment. This can also be used to keep comments in
// minified HTML, such as `<!--[ Copyright John Doe, MIT Licensed ]-->`
function isConditionalComment(tag) {
  return /(?:^<!--\[)|(?:\]-->$)/.test(tag)
}

// Remove leading whitespace and newlines from a string. Whitespace at the end
// of a line will be maintained
function trimLeading(text) {
  return text ? text.replace(/\r?\n\s*/g, '') : ''
}

// Remove leading & trailing whitespace and newlines from a string
function trimText(text) {
  return text ? text.replace(/\s*\r?\n\s*/g, '') : ''
}

// Within a tag, remove leading & trailing whitespace. Keep a linebreak, since
// this could be the separator between attributes
function trimTag(tag) {
  return tag.replace(/(?:\s*\r?\n\s*)+/g, '\n')
}

// Remove linebreaks, leading & trailing space, and comments. Maintain a
// linebreak between HTML tag attributes and maintain conditional comments.
function minify(html) {
  var minified = ''
    , minifyContent = true

  parse(html, {
    start: function(tag, tagName, attrs) {
      minifyContent = !('x-no-minify' in attrs)
      minified += trimTag(tag)
    }
  , end: function(tag) {
      minified += trimTag(tag)
    }
  , text: function(text) {
      minified += minifyContent ? trimText(text) : text
    }
  , comment: function(tag) {
      if (isConditionalComment(tag)) minified += tag
    }
  , other: function(tag) {
      minified += tag
    }
  })
  return minified
}
