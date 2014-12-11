var htmlUtil = require('html-util');
var derbyTemplates = require('derby-templates');
var templates = derbyTemplates.templates;
var expressions = derbyTemplates.expressions;
var createPathExpression = require('./createPathExpression');
var markup = require('./markup');

exports.createTemplate = createTemplate;
exports.createStringTemplate = createStringTemplate;
exports.createExpression = createExpression;
exports.createPathExpression = createPathExpression;
exports.markup = markup;

// View.prototype._parse is defined here, so that it doesn't have to
// be included in the client if templates are all parsed server-side
templates.View.prototype._parse = function() {
  // Wrap parsing in a try / catch to add context to message when throwing
  var template;
  try {
    if (this.string) {
      template = createStringTemplate(this.source, this);
    } else {
      var source = (this.unminified) ? this.source :
        htmlUtil.minify(this.source).replace(/&sp;/g, ' ');
      template = createTemplate(source, this);
    }
  } catch (err) {
    var message = '\n\nWithin template "' + this.name + '":\n' + this.source;
    throw appendErrorMessage(err, message);
  }
  this.template = template;
  return template;
};

// Modified and shared among the following parse functions. It's OK for this
// to be shared at the module level, since it is only used by synchronous code
var parseNode;

function createTemplate(source, view) {
  parseNode = new ParseNode(view);
  htmlUtil.parse(source, {
    start: parseHtmlStart
  , end: parseHtmlEnd
  , text: parseHtmlText
  , comment: parseHtmlComment
  , other: parseHtmlOther
  });
  // Allow for elements at the end of a template to not be closed. This is
  // especially important so that the </body> and </html> tags can be omitted,
  // since Derby sends an additional script tag after the HTML for the page
  while (parseNode.parent) {
    parseNode = parseNode.parent;
    var last = parseNode.last();
    if (last instanceof templates.Element) {
      last.notClosed = true;
      last.endTag = '';
      continue;
    }
    unexpected();
  }
  return new templates.Template(parseNode.content);
}

function createStringTemplate(source, view) {
  parseNode = new ParseNode(view);
  parseText(source, parseTextLiteral, parseTextExpression);
  return new templates.Template(parseNode.content);
}

function parseHtmlStart(tag, tagName, attributes, selfClosing) {
  var lowerTagName = tagName.toLowerCase();
  var hooks;
  if (lowerTagName !== 'view' && !viewForTagName(lowerTagName)) {
    hooks = hooksFromAttributes(attributes, 'Element');
  }
  var attributesMap = parseAttributes(attributes);
  var namespaceUri = (lowerTagName === 'svg') ?
    templates.NAMESPACE_URIS.svg : parseNode.namespaceUri;
  var Constructor = templates.Element;
  if (lowerTagName === 'tag') {
    Constructor = templates.DynamicElement;
    tagName = attributesMap.is;
    delete attributesMap.is;
  }
  if (selfClosing || templates.VOID_ELEMENTS[lowerTagName]) {
    var element = new Constructor(tagName, attributesMap, null, hooks, selfClosing, null, namespaceUri);
    parseNode.content.push(element);
    parseElementClose(lowerTagName);
  } else {
    parseNode = parseNode.child();
    parseNode.namespaceUri = namespaceUri;
    var element = new Constructor(tagName, attributesMap, parseNode.content, hooks, selfClosing, null, namespaceUri);
    parseNode.parent.content.push(element);
  }
}

function parseAttributes(attributes) {
  var attributesMap;
  for (var key in attributes) {
    if (!attributesMap) attributesMap = {};

    var value = attributes[key];
    var match = /([^:]+):[^:]/.exec(key);
    var nsUri = match && templates.NAMESPACE_URIS[match[1]];
    if (value === '' || typeof value !== 'string') {
      attributesMap[key] = new templates.Attribute(value, nsUri);
      continue;
    }

    parseNode = parseNode.child();
    parseText(htmlUtil.unescapeEntities(value), parseTextLiteral, parseTextExpression);

    if (parseNode.content.length === 1) {
      var item = parseNode.content[0];
      attributesMap[key] =
        (item instanceof templates.Text) ? new templates.Attribute(item.data, nsUri) :
        (item instanceof templates.DynamicText) ?
          (item.expression instanceof expressions.LiteralExpression) ?
            new templates.Attribute(item.expression.value, nsUri) :
            new templates.DynamicAttribute(item.expression, nsUri) :
          new templates.DynamicAttribute(item, nsUri);

    } else if (parseNode.content.length > 1) {
      var template = new templates.Template(parseNode.content);
      attributesMap[key] = new templates.DynamicAttribute(template, nsUri);

    } else {
      throw new Error('Error parsing ' + key + ' attribute: ' + value);
    }

    parseNode = parseNode.parent;
  }
  return attributesMap;
}

function parseHtmlEnd(tag, tagName) {
  parseNode = parseNode.parent;
  var last = parseNode.last();
  if (!(
    (last instanceof templates.DynamicElement && tagName.toLowerCase() === 'tag') ||
    (last instanceof templates.Element && last.tagName === tagName)
  )) {
    throw new Error('Mismatched closing HTML tag: ' + tag);
  }
  parseElementClose(tagName);
}

function parseElementClose(tagName) {
  if (tagName === 'view') {
    var element = parseNode.content.pop();
    parseViewElement(element);
    return;
  }
  var view = viewForTagName(tagName);
  if (view) {
    var element = parseNode.content.pop();
    parseNamedViewElement(element, view, view.name);
    return;
  }
  var element = parseNode.last();
  markup.emit('element', element);
  markup.emit('element:' + tagName, element);
}

function viewForTagName(tagName) {
  return parseNode.view && parseNode.view.views.elementMap[tagName];
}

function parseHtmlText(data, isRawText) {
  var unescaped = (isRawText) ? data : htmlUtil.unescapeEntities(data);
  parseText(unescaped, parseTextLiteral, parseTextExpression, 'html');
}

function parseHtmlComment(tag, data) {
  // Only output comments that start with `<!--[` and end with `]-->`
  if (!htmlUtil.isConditionalComment(tag)) return;
  var comment = new templates.Comment(data);
  parseNode.content.push(comment);
}

var doctypeRegExp = /^<!DOCTYPE\s+([^\s]+)(?:\s+(PUBLIC|SYSTEM)\s+"([^"]+)"(?:\s+"([^"]+)")?)?\s*>/i;

function parseHtmlOther(tag) {
  var match = doctypeRegExp.exec(tag);
  if (match) {
    var name = match[1];
    var idType = match[2] && match[2].toLowerCase();
    var publicId, systemId;
    if (idType === 'public') {
      publicId = match[3];
      systemId = match[4];
    } else if (idType === 'system') {
      systemId = match[3];
    }
    var doctype = new templates.Doctype(name, publicId, systemId);
    parseNode.content.push(doctype);
  } else {
    unexpected(tag);
  }
}

function parseTextLiteral(data) {
  var text = new templates.Text(data);
  parseNode.content.push(text);
}

function parseTextExpression(expression, environment) {
  if (expression.meta.blockType) {
    parseBlockExpression(expression);
  } else if (expression.meta.valueType === 'view') {
    parseViewExpression(expression);
  } else if (expression.meta.unescaped && environment === 'html') {
    var html = new templates.DynamicHtml(expression);
    parseNode.content.push(html);
  } else {
    var text = new templates.DynamicText(expression);
    parseNode.content.push(text);
  }
}

function parseBlockExpression(expression) {
  var blockType = expression.meta.blockType;

  // Block ending
  if (expression.meta.isEnd) {
    parseNode = parseNode.parent;
    // Validate that the block ending matches an appropriate block start
    var last = parseNode.last();
    var lastExpression = last && (last.expression || (last.expressions && last.expressions[0]));
    if (!(
      lastExpression &&
      (blockType === 'end' && lastExpression.meta.blockType) ||
      (blockType === lastExpression.meta.blockType)
    )) {
      throw new Error('Mismatched closing template tag: ' + expression.meta.source);
    }

  // Continuing block
  } else if (blockType === 'else' || blockType === 'else if') {
    parseNode = parseNode.parent;
    var last = parseNode.last();
    parseNode = parseNode.child();

    if (last instanceof templates.ConditionalBlock) {
      last.expressions.push(expression);
      last.contents.push(parseNode.content);
    } else if (last instanceof templates.EachBlock) {
      if (blockType !== 'else') unexpected(expression.meta.source);
      last.elseContent = parseNode.content;
    } else {
      unexpected(expression.meta.source);
    }

  // Block start
  } else {
    var nextNode = parseNode.child();
    var block;
    if (blockType === 'if' || blockType === 'unless') {
      block = new templates.ConditionalBlock([expression], [nextNode.content]);
    } else if (blockType === 'each') {
      block = new templates.EachBlock(expression, nextNode.content);
    } else {
      block = new templates.Block(expression, nextNode.content);
    }
    parseNode.content.push(block);
    parseNode = nextNode;
  }
}

function parseViewElement(element) {
  var nameAttribute = element.attributes.name;
  if (!nameAttribute) {
    throw new Error('The <view> element requires a name attribute');
  }
  delete element.attributes.name;

  if (nameAttribute.expression) {
    var viewAttributes = viewAttributesFromElement(element);
    var hooks = hooksFromAttributes(viewAttributes, 'Component');
    var remaining = element.content || [];
    var viewInstance = new templates.DynamicViewInstance(nameAttribute.expression, viewAttributes, hooks);
    finishParseViewElement(viewAttributes, remaining, viewInstance);
  } else {
    var name = nameAttribute.data;
    var view = findView(name);
    parseNamedViewElement(element, view, name);
  }
}

function findView(name) {
  var view = parseNode.view.views.find(name, parseNode.view.namespace);
  if (!view) {
    var message = parseNode.view.views.findErrorMessage(name);
    throw new Error(message);
  }
  return view;
}

function parseNamedViewElement(element, view, name) {
  var viewAttributes = viewAttributesFromElement(element);
  var hooks = hooksFromAttributes(viewAttributes, 'Component');
  var remaining = parseContentAttributes(element.content, view, viewAttributes);
  var viewInstance = new templates.ViewInstance(view.registeredName, viewAttributes, hooks);
  finishParseViewElement(viewAttributes, remaining, viewInstance);
}

function finishParseViewElement(viewAttributes, remaining, viewInstance) {
  if (!viewAttributes.hasOwnProperty('content') && remaining.length) {
    var template = new templates.Template(remaining);
    viewAttributes.content = (viewAttributes.within) ? template :
      new templates.ParentWrapper(template);
  }
  parseNode.content.push(viewInstance);
}

function viewAttributesFromElement(element) {
  var viewAttributes = {};
  for (var key in element.attributes) {
    var attribute = element.attributes[key];
    var camelCased = dashToCamelCase(key);
    viewAttributes[camelCased] =
      (attribute.expression instanceof templates.Template) ?
        new templates.ParentWrapper(attribute.expression) :
      (attribute.expression instanceof expressions.Expression) ?
        new templates.ParentWrapper(new templates.DynamicText(attribute.expression), attribute.expression) :
      attribute.data;
  }
  return viewAttributes;
}

function hooksFromAttributes(attributes, type) {
  if (!attributes) return;
  var hooks = [];

  for (var key in attributes) {
    var value = attributes[key];
    var camelName = dashToCamelCase(key);

    if (key === 'as') {
      var segments = value.split('.');
      hooks.push(new templates.MarkupAs(segments));
      delete attributes.as;
    }

    var match, eventName;
    if (type === 'Component') {
      match = /^on([A-Z_].*)/.exec(key);
      eventName = match && match[1].charAt(0).toLowerCase() + match[1].slice(1);
    } else {
      match = /^on-(.+)/.exec(key);
      eventName = match && match[1];
    }
    if (eventName) {
      var expression = createPathExpression(value);
      var Constructor = templates[type + 'On'];
      hooks.push(new Constructor(eventName, expression));
      delete attributes[key];
    }
  }

  if (hooks.length) return hooks;
}

function dashToCamelCase(string) {
  return string.replace(/-./g, function(match) {
    return match.charAt(1).toUpperCase();
  });
}

function parseContentAttributes(content, view, viewAttributes) {
  var remaining = [];
  if (!content) return remaining;
  for (var i = 0, len = content.length; i < len; i++) {
    var item = content[i];
    var name = (item instanceof templates.Element) && item.tagName;

    if (name === 'attribute') {
      var name = parseNameAttribute(item);
      parseAttributeElement(item, name, viewAttributes);

    } else if (view.attributesMap && view.attributesMap[name]) {
      parseAttributeElement(item, name, viewAttributes);

    } else if (name === 'array') {
      var name = parseNameAttribute(item);
      parseArrayElement(item, name, viewAttributes);

    } else if (view.arraysMap && view.arraysMap[name]) {
      parseArrayElement(item, view.arraysMap[name], viewAttributes);

    } else {
      remaining.push(item);
    }
  }
  return remaining;
}

function parseNameAttribute(element) {
  var nameAttribute = element.attributes.name;
  var name = nameAttribute.data;
  if (!name) {
    throw new Error('The <' + element.tagName + '> element requires a literal name attribute');
  }
  delete element.attributes.name;
  return name;
}

function parseAttributeElement(element, name, viewAttributes) {
  var camelName = dashToCamelCase(name);
  var content = new templates.Template(element.content);
  viewAttributes[camelName] = (element.attributes && element.attributes.within) ?
    content : new templates.ParentWrapper(content);
}

function parseArrayElement(element, name, viewAttributes) {
  var item = viewAttributesFromElement(element);
  if (!item.hasOwnProperty('content') && element.content.length) {
    item.content = new templates.ParentWrapper(
      new templates.Template(element.content)
    );
  }
  var camelName = dashToCamelCase(name);
  var viewAttribute = viewAttributes[camelName] ||
    (viewAttributes[camelName] = []);
  viewAttribute.push(item);
}

function parseViewExpression(expression) {
  // If there are multiple arguments separated by commas, they will get parsed
  // as a SequenceExpression
  var nameExpression, attributesExpression;
  if (expression instanceof expressions.SequenceExpression) {
    nameExpression = expression.args[0];
    attributesExpression = expression.args[1];
  } else {
    nameExpression = expression;
  }

  var viewAttributes = viewAttributesFromExpression(attributesExpression);
  var hooks = hooksFromAttributes(viewAttributes, 'Component');

  // A ViewInstance has a static name, and a DynamicViewInstance gets its name
  // at render time
  var viewInstance;
  if (nameExpression instanceof expressions.LiteralExpression) {
    var name = nameExpression.get();
    // Will throw if the view can't be found immediately
    findView(name);
    viewInstance = new templates.ViewInstance(name, viewAttributes, hooks);
  } else {
    viewInstance = new templates.DynamicViewInstance(nameExpression, hooks, viewAttributes);
  }
  parseNode.content.push(viewInstance);
}

function viewAttributesFromExpression(expression) {
  if (!expression) return;
  var object = objectFromObjectExpression(expression);

  var viewAttributes = {};
  for (var key in object) {
    var value = object[key];
    viewAttributes[key] =
      (value instanceof expressions.LiteralExpression) ? value.value :
      (value instanceof expressions.Expression) ?
        new templates.ParentWrapper(new templates.DynamicText(value), value) :
      value;
  }
  return viewAttributes;
}

function objectFromObjectExpression(expression) {
  if (expression instanceof expressions.LiteralExpression) {
    var object = expression.value;
    if (typeof object !== 'object') unexpected();
    return object;

  // Get the expressions and keys from a OperatorExpression that would have been
  // created for an object literal with non-literal properties
  } else if (expression instanceof expressions.OperatorExpression && expression.name === '{}') {
    var object = {};
    var args = expression.args;
    for (var i = 0, len = args.length; i < len; i += 2) {
      var key = args[i].value;
      var value = args[i + 1];
      object[key] = value;
    }
    return object;

  } else {
    unexpected();
  }
}

function ParseNode(view, parent) {
  this.view = view;
  this.parent = parent;
  this.content = [];
  this.namespaceUri = parent && parent.namespaceUri;
}
ParseNode.prototype.child = function() {
  return new ParseNode(this.view, this);
};
ParseNode.prototype.last = function() {
  return this.content[this.content.length - 1];
};

function parseText(data, onLiteral, onExpression, environment) {
  var current = data;
  var last;
  while (current) {
    if (current === last) throw new Error('Error parsing template text: ' + data);
    last = current;

    var start = current.indexOf('{{');
    if (start === -1) {
      onLiteral(current);
      return;
    }

    var end = matchBraces(current, 2, start, '{', '}');
    if (end === -1) throw new Error('Mismatched braces in: ' + data);

    if (start > 0) {
      var before = current.slice(0, start);
      onLiteral(current.slice(0, start));
    }

    var inside = current.slice(start + 2, end - 2);
    if (inside) {
      var expression = createExpression(inside);
      onExpression(expression, environment);
    }

    current = current.slice(end);
  }
}

function matchBraces(text, num, i, openChar, closeChar) {
  i += num;
  while (num) {
    var close = text.indexOf(closeChar, i);
    var open = text.indexOf(openChar, i);
    var hasClose = close !== -1;
    var hasOpen = open !== -1;
    if (hasClose && (!hasOpen || (close < open))) {
      i = close + 1;
      num--;
      continue;
    } else if (hasOpen) {
      i = open + 1;
      num++;
      continue;
    } else {
      return -1;
    }
  }
  return i;
}

var blockRegExp = /^(if|unless|else if|each|with|on)\s+([\s\S]+?)(?:\s+as\s+([^,\s]+)\s*(?:,\s*(\S+))?)?$/;
var valueRegExp = /^(?:(view|unbound|bound|unescaped)\s+)?([\s\S]*)/;

function createExpression(source) {
  source = source.trim();
  var meta = new expressions.ExpressionMeta(source);

  // Parse block expression //

  // The block expressions `if`, `unless`, `else if`, `each`, `with`, and `on`
  // must have a single blockType keyword and a path. They may have an optional
  // alias assignment
  var match = blockRegExp.exec(source);
  var path;
  if (match) {
    meta.blockType = match[1];
    path = match[2];
    meta.as = match[3];
    meta.keyAs = match[4];

  // The blocks `else`, `unbound`, and `bound` may not have a path or alias
  } else if (source === 'else' || source === 'unbound' || source === 'bound') {
    meta.blockType = source;

  // Any source that starts with a `/` is treated as an end block. Either a
  // `{{/}}` with no following characters or a `{{/if}}` style ending is valid
  } else if (source.charAt(0) === '/') {
    meta.isEnd = true;
    meta.blockType = source.slice(1).trim() || 'end';


  // Parse value expression //

  // A value expression has zero or many keywords and an expression
  } else {
    path = source;
    var keyword;
    do {
      match = valueRegExp.exec(path);
      keyword = match[1];
      path = match[2];
      if (keyword === 'unescaped') {
        meta.unescaped = true;
      } else if (keyword === 'unbound' || keyword === 'bound') {
        meta.bindType = keyword;
      } else if (keyword) {
        meta.valueType = keyword;
      }
    } while (keyword);
  }

  // Wrap parsing in a try / catch to add context to message when throwing
  var expression;
  try {
    expression = (path) ?
      createPathExpression(path) :
      new expressions.Expression();
  } catch (err) {
    var message = '\n\nWithin expression: ' + source;
    throw appendErrorMessage(err, message);
  }
  expression.meta = meta;
  return expression;
}

function unexpected(source) {
  throw new Error('Error parsing template: ' + source);
}

function appendErrorMessage(err, message) {
  if (err instanceof Error) {
    err.message += message;
    return err;
  }
  return new Error(err + message);
}
