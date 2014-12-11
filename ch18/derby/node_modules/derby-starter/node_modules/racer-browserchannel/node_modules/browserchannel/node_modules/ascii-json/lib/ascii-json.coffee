asciiJSON = exports

# Lazy man's ASCII check
asciiJSON.isAscii = (text) -> /^[\x00-\x7F]*$/.test(text)


# Returns given string with non-ASCII characters escaped
asciiJSON.escapeNonAsciis = (text) ->
  chars = []
  i = 0
  while i < text.length
    code = text.charCodeAt(i)
    if code < 128
      chars.push text[i]
    else
      if code < 256
        chars.push '\\u00'
      else if code < 4096
        chars.push '\\u0'
      else
        chars.push '\\u'
      chars.push code.toString(16)
    i++
  chars.join('')



asciiJSON.stringify = (object) ->
  utf8JSON = JSON.stringify(object)
  asciiJSON.escapeNonAsciis(utf8JSON)


# Use JSON.parse which will take care of restoring non-ASCII
# unicode characters into their full glory.
asciiJSON.parse = JSON.parse
