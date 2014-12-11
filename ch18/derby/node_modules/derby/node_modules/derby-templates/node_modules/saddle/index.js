if (typeof require === 'function') {
  var serializeObject = require('serialize-object');
}

// UPDATE_PROPERTIES map HTML attribute names to an Element DOM property that
// should be used for setting on bindings updates instead of s'test'Attribute.
//
// https://github.com/jquery/jquery/blob/1.x-master/src/attributes/prop.js
// https://github.com/jquery/jquery/blob/master/src/attributes/prop.js
// http://webbugtrack.blogspot.com/2007/08/bug-242-setattribute-doesnt-always-work.html
var UPDATE_PROPERTIES = {
  checked: 'checked'
, disabled: 'disabled'
, selected: 'selected'
, type: 'type'
, value: 'value'
, 'class': 'className'
, 'for': 'htmlFor'
, tabindex: 'tabIndex'
, readonly: 'readOnly'
, maxlength: 'maxLength'
, cellspacing: 'cellSpacing'
, cellpadding: 'cellPadding'
, rowspan: 'rowSpan'
, colspan: 'colSpan'
, usemap: 'useMap'
, frameborder: 'frameBorder'
, contenteditable: 'contentEditable'
, enctype: 'encoding'
, id: 'id'
, title: 'title'
};
// CREATE_PROPERTIES map HTML attribute names to an Element DOM property that
// should be used for setting on Element rendering instead of setAttribute.
// input.defaultChecked and input.defaultValue affect the attribute, so we want
// to use these for initial dynamic rendering. For binding updates,
// input.checked and input.value are modified.
var CREATE_PROPERTIES = {};
mergeInto(UPDATE_PROPERTIES, CREATE_PROPERTIES);
CREATE_PROPERTIES.checked = 'defaultChecked';
CREATE_PROPERTIES.value = 'defaultValue';

// http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
var VOID_ELEMENTS = {
  area: true
, base: true
, br: true
, col: true
, embed: true
, hr: true
, img: true
, input: true
, keygen: true
, link: true
, menuitem: true
, meta: true
, param: true
, source: true
, track: true
, wbr: true
};

var NAMESPACE_URIS = {
  svg: 'http://www.w3.org/2000/svg'
, xlink: 'http://www.w3.org/1999/xlink'
, xmlns: 'http://www.w3.org/2000/xmlns/'
};

exports.CREATE_PROPERTIES = CREATE_PROPERTIES;
exports.UPDATE_PROPERTIES = UPDATE_PROPERTIES;
exports.VOID_ELEMENTS = VOID_ELEMENTS;
exports.NAMESPACE_URIS = NAMESPACE_URIS;

// Template Classes
exports.Template = Template;
exports.Doctype = Doctype;
exports.Text = Text;
exports.DynamicText = DynamicText;
exports.Comment = Comment;
exports.DynamicComment = DynamicComment;
exports.Html = Html;
exports.DynamicHtml = DynamicHtml;
exports.Element = Element;
exports.DynamicElement = DynamicElement;
exports.Block = Block;
exports.ConditionalBlock = ConditionalBlock;
exports.EachBlock = EachBlock;

exports.Attribute = Attribute;
exports.DynamicAttribute = DynamicAttribute;

// Binding Classes
exports.Binding = Binding;
exports.NodeBinding = NodeBinding;
exports.AttributeBinding = AttributeBinding;
exports.RangeBinding = RangeBinding;

function Template(content) {
  this.content = content;
}
Template.prototype.get = function(context, unescaped) {
  return contentHtml(this.content, context, unescaped);
};
Template.prototype.getFragment = function(context, binding) {
  var fragment = document.createDocumentFragment();
  this.appendTo(fragment, context, binding);
  return fragment;
};
Template.prototype.appendTo = function(parent, context) {
  appendContent(parent, this.content, context);
};
Template.prototype.attachTo = function(parent, node, context) {
  return attachContent(parent, node, this.content, context);
};
Template.prototype.update = function() {};
Template.prototype.stringify = function(value) {
  return (value == null) ? '' : value + '';
};
Template.prototype.module = 'templates';
Template.prototype.type = 'Template';
Template.prototype.serialize = function() {
  return serializeObject.instance(this, this.content);
};


function Doctype(name, publicId, systemId) {
  this.name = name;
  this.publicId = publicId;
  this.systemId = systemId;
}
Doctype.prototype = new Template();
Doctype.prototype.get = function() {
  var publicText = (this.publicId) ?
    ' PUBLIC "' + this.publicId  + '"' :
    '';
  var systemText = (this.systemId) ?
    (this.publicId) ?
      ' "' + this.systemId + '"' :
      ' SYSTEM "' + this.systemId + '"' :
    '';
  return '<!DOCTYPE ' + this.name + publicText + systemText + '>';
};
Doctype.prototype.appendTo = function() {
  // Doctype could be created via:
  //   document.implementation.createDocumentType(this.name, this.publicId, this.systemId)
  // However, it does not appear possible or useful to append it to the
  // document fragment. Therefore, just don't render it in the browser
};
Doctype.prototype.attachTo = function(parent, node) {
  if (!node || node.nodeType !== 10) {
    throw attachError(parent, node);
  }
  return node.nextSibling;
};
Doctype.prototype.type = 'Doctype';
Doctype.prototype.serialize = function() {
  return serializeObject.instance(this, this.name, this.publicId, this.systemId);
};

function Text(data) {
  this.data = data;
  this.escaped = escapeHtml(data);
}
Text.prototype = new Template();
Text.prototype.get = function(context, unescaped) {
  return (unescaped) ? this.data : this.escaped;
};
Text.prototype.appendTo = function(parent) {
  var node = document.createTextNode(this.data);
  parent.appendChild(node);
};
Text.prototype.attachTo = function(parent, node) {
  return attachText(parent, node, this.data, this);
};
Text.prototype.type = 'Text';
Text.prototype.serialize = function() {
  return serializeObject.instance(this, this.data);
};

function DynamicText(expression) {
  this.expression = expression;
}
DynamicText.prototype = new Template();
DynamicText.prototype.get = function(context, unescaped) {
  var value = this.expression.get(context);
  if (value instanceof Template) {
    do {
      value = value.get(context, unescaped);
    } while (value instanceof Template);
    return value;
  }
  var data = this.stringify(value);
  return (unescaped) ? data : escapeHtml(data);
};
DynamicText.prototype.appendTo = function(parent, context) {
  var value = this.expression.get(context);
  if (value instanceof Template) {
    value.appendTo(parent, context);
    return;
  }
  var data = this.stringify(value);
  var node = document.createTextNode(data);
  parent.appendChild(node);
  addNodeBinding(this, context, node);
};
DynamicText.prototype.attachTo = function(parent, node, context) {
  var value = this.expression.get(context);
  if (value instanceof Template) {
    return value.attachTo(parent, node, context);
  }
  var data = this.stringify(value);
  return attachText(parent, node, data, this, context);
};
DynamicText.prototype.update = function(context, binding) {
  binding.node.data = this.stringify(this.expression.get(context));
};
DynamicText.prototype.type = 'DynamicText';
DynamicText.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression);
};

function attachText(parent, node, data, template, context) {
  if (!node) {
    var newNode = document.createTextNode(data);
    parent.appendChild(newNode);
    addNodeBinding(template, context, newNode);
    return;
  }
  if (node.nodeType === 3) {
    // Proceed if nodes already match
    if (node.data === data) {
      addNodeBinding(template, context, node);
      return node.nextSibling;
    }
    data = normalizeLineBreaks(data);
    // Split adjacent text nodes that would have been merged together in HTML
    var nextNode = splitData(node, data.length);
    if (node.data !== data) {
      throw attachError(parent, node);
    }
    addNodeBinding(template, context, node);
    return nextNode;
  }
  // An empty text node might not be created at the end of some text
  if (data === '') {
    var newNode = document.createTextNode('');
    parent.insertBefore(newNode, node || null);
    addNodeBinding(template, context, newNode);
    return node;
  }
  throw attachError(parent, node);
}

function Comment(data, hooks) {
  this.data = data;
  this.hooks = hooks;
}
Comment.prototype = new Template();
Comment.prototype.get = function() {
  return '<!--' + this.data + '-->';
};
Comment.prototype.appendTo = function(parent, context) {
  var node = document.createComment(this.data);
  emitHooks(this.hooks, context, node);
  parent.appendChild(node);
};
Comment.prototype.attachTo = function(parent, node, context) {
  return attachComment(parent, node, this.data, this, context);
};
Comment.prototype.type = 'Comment';
Comment.prototype.serialize = function() {
  return serializeObject.instance(this, this.data, this.hooks);
}

function DynamicComment(expression, hooks) {
  this.expression = expression;
  this.hooks = hooks;
}
DynamicComment.prototype = new Template();
DynamicComment.prototype.get = function(context) {
  var value = getUnescapedValue(this.expression, context);
  var data = this.stringify(value);
  return '<!--' + data + '-->';
};
DynamicComment.prototype.appendTo = function(parent, context) {
  var value = getUnescapedValue(this.expression, context);
  var data = this.stringify(value);
  var node = document.createComment(data);
  parent.appendChild(node);
  addNodeBinding(this, context, node);
};
DynamicComment.prototype.attachTo = function(parent, node, context) {
  var value = getUnescapedValue(this.expression, context);
  var data = this.stringify(value);
  return attachComment(parent, node, data, this, context);
};
DynamicComment.prototype.update = function(context, binding) {
  var value = getUnescapedValue(this.expression, context);
  binding.node.data = this.stringify(value);
};
DynamicComment.prototype.type = 'DynamicComment';
DynamicComment.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression, this.hooks);
}

function attachComment(parent, node, data, template, context) {
  // Sometimes IE fails to create Comment nodes from HTML or innerHTML.
  // This is an issue inside of <select> elements, for example.
  if (!node || node.nodeType !== 8) {
    var newNode = document.createComment(data);
    parent.insertBefore(newNode, node || null);
    addNodeBinding(template, context, newNode);
    return node;
  }
  // Proceed if nodes already match
  if (node.data === data) {
    addNodeBinding(template, context, node);
    return node.nextSibling;
  }
  throw attachError(parent, node);
}

function addNodeBinding(template, context, node) {
  emitHooks(template.hooks, context, node);
  if (template.expression) {
    context.addBinding(new NodeBinding(template, context, node));
  }
}

function Html(data) {
  this.data = data;
}
Html.prototype = new Template();
Html.prototype.get = function() {
  return this.data;
};
Html.prototype.appendTo = function(parent) {
  var fragment = createHtmlFragment(parent, this.data);
  parent.appendChild(fragment);
};
Html.prototype.attachTo = function(parent, node) {
  return attachHtml(parent, node, this.data);
};
Html.prototype.type = "Html";
Html.prototype.serialize = function() {
  return serializeObject.instance(this, this.data);
};

function DynamicHtml(expression) {
  this.expression = expression;
  this.ending = '/' + expression;
}
DynamicHtml.prototype = new Template();
DynamicHtml.prototype.get = function(context) {
  var value = getUnescapedValue(this.expression, context);
  return this.stringify(value);
};
DynamicHtml.prototype.appendTo = function(parent, context, binding) {
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  var value = getUnescapedValue(this.expression, context);
  var html = this.stringify(value);
  var fragment = createHtmlFragment(parent, html);
  parent.appendChild(start);
  parent.appendChild(fragment);
  parent.appendChild(end);
  updateRange(context, binding, this, start, end);
};
DynamicHtml.prototype.attachTo = function(parent, node, context) {
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  var value = getUnescapedValue(this.expression, context);
  var html = this.stringify(value);
  parent.insertBefore(start, node || null);
  node = attachHtml(parent, node, html);
  parent.insertBefore(end, node || null);
  updateRange(context, null, this, start, end);
  return node;
};
DynamicHtml.prototype.update = function(context, binding) {
  // Get start and end in advance, since binding is mutated in getFragment
  var start = binding.start;
  var end = binding.end;
  var value = getUnescapedValue(this.expression, context);
  var html = this.stringify(value);
  var fragment = createHtmlFragment(binding.start.parentNode, html);
  var innerOnly = true;
  replaceRange(context, start, end, fragment, binding, innerOnly);
};
DynamicHtml.prototype.type = 'DynamicHtml';
DynamicHtml.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression);
};

function createHtmlFragment(parent, html) {
  if (parent.nodeType === 1) {
    var range = document.createRange();
    range.selectNodeContents(parent);
    return range.createContextualFragment(html);
  }
  var div = document.createElement('div');
  var range = document.createRange();
  div.innerHTML = html;
  range.selectNodeContents(div);
  return range.extractContents();
}
function attachHtml(parent, node, html) {
  var fragment = createHtmlFragment(parent, html);
  for (var i = 0, len = fragment.childNodes.length; i < len; i++) {
    if (!node) throw attachError(parent, node);
    node = node.nextSibling;
  }
  return node;
}

function Attribute(data, ns) {
  this.data = data;
  this.ns = ns;
}
Attribute.prototype.get = Attribute.prototype.getBound = function(context) {
  return this.data;
};
Attribute.prototype.module = Template.prototype.module;
Attribute.prototype.type = 'Attribute';
Attribute.prototype.serialize = function() {
  return serializeObject.instance(this, this.data, this.ns);
};

function DynamicAttribute(expression, ns) {
  // In attributes, expression may be an instance of Template or Expression
  this.expression = expression;
  this.ns = ns;
  this.elementNs = null;
}
DynamicAttribute.prototype = new Attribute();
DynamicAttribute.prototype.get = function(context) {
  return getUnescapedValue(this.expression, context);
};
DynamicAttribute.prototype.getBound = function(context, element, name, elementNs) {
  this.elementNs = elementNs;
  context.addBinding(new AttributeBinding(this, context, element, name));
  return getUnescapedValue(this.expression, context);
};
DynamicAttribute.prototype.update = function(context, binding) {
  var value = getUnescapedValue(this.expression, context);
  var element = binding.element;
  var propertyName = !this.elementNs && UPDATE_PROPERTIES[binding.name];
  if (propertyName) {
    if (propertyName === 'value' && (element.value === value || element.valueAsNumber === value)) return;
    if (value === void 0) value = null;
    element[propertyName] = value;
    return;
  }
  if (value === false || value == null) {
    if (this.ns) {
      element.removeAttributeNS(this.ns, binding.name);
    } else {
      element.removeAttribute(binding.name);
    }
    return;
  }
  if (value === true) value = binding.name;
  if (this.ns) {
    element.setAttributeNS(this.ns, binding.name, value);
  } else {
    element.setAttribute(binding.name, value);
  }
};
DynamicAttribute.prototype.type = 'DynamicAttribute';
DynamicAttribute.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression, this.ns);
};

function getUnescapedValue(expression, context) {
  var unescaped = true;
  var value = expression.get(context, unescaped);
  while (value instanceof Template) {
    value = value.get(context, unescaped);
  }
  return value;
}

function Element(tagName, attributes, content, hooks, selfClosing, notClosed, ns) {
  this.tagName = tagName;
  this.attributes = attributes;
  this.content = content;
  this.hooks = hooks;
  this.selfClosing = selfClosing;
  this.notClosed = notClosed;
  this.ns = ns;

  this.endTag = getEndTag(tagName, selfClosing, notClosed);
  this.startClose = getStartClose(selfClosing);
  var lowerTagName = tagName && tagName.toLowerCase();
  this.unescapedContent = (lowerTagName === 'script' || lowerTagName === 'style');
}
Element.prototype = new Template();
Element.prototype.getTagName = function() {
  return this.tagName;
};
Element.prototype.getEndTag = function() {
  return this.endTag;
};
Element.prototype.get = function(context) {
  var tagName = this.getTagName(context);
  var endTag = this.getEndTag(tagName);
  var tagItems = [tagName];
  for (var key in this.attributes) {
    var value = this.attributes[key].get(context);
    if (value === true) {
      tagItems.push(key);
    } else if (value !== false && value != null) {
      tagItems.push(key + '="' + escapeAttribute(value) + '"');
    }
  }
  var startTag = '<' + tagItems.join(' ') + this.startClose;
  if (this.content) {
    var inner = contentHtml(this.content, context, this.unescapedContent);
    return startTag + inner + endTag;
  }
  return startTag + endTag;
};
Element.prototype.appendTo = function(parent, context) {
  var tagName = this.getTagName(context);
  var element = (this.ns) ?
    document.createElementNS(this.ns, tagName) :
    document.createElement(tagName);
  emitHooks(this.hooks, context, element);
  for (var key in this.attributes) {
    var attribute = this.attributes[key];
    var value = attribute.getBound(context, element, key, this.ns);
    if (value === false || value == null) continue;
    var propertyName = !this.ns && CREATE_PROPERTIES[key];
    if (propertyName) {
      element[propertyName] = value;
      continue;
    }
    if (value === true) value = key;
    if (attribute.ns) {
      element.setAttributeNS(attribute.ns, key, value);
    } else {
      element.setAttribute(key, value);
    }
  }
  if (this.content) appendContent(element, this.content, context);
  parent.appendChild(element);
};
Element.prototype.attachTo = function(parent, node, context) {
  var tagName = this.getTagName(context);
  if (
    !node ||
    node.nodeType !== 1 ||
    node.tagName.toLowerCase() !== tagName.toLowerCase()
  ) {
    throw attachError(parent, node);
  }
  emitHooks(this.hooks, context, node);
  for (var key in this.attributes) {
    // Get each attribute to create bindings
    this.attributes[key].getBound(context, node, key, this.ns);
    // TODO: Ideally, this would also check that the node's current attributes
    // are equivalent, but there are some tricky edge cases
  }
  if (this.content) attachContent(node, node.firstChild, this.content, context);
  return node.nextSibling;
};
Element.prototype.type = 'Element';
Element.prototype.serialize = function() {
  return serializeObject.instance(
    this
  , this.tagName
  , this.attributes
  , this.content
  , this.hooks
  , this.selfClosing
  , this.notClosed
  , this.ns
  );
};

function DynamicElement(tagName, attributes, content, hooks, selfClosing, notClosed, ns) {
  this.tagName = tagName;
  this.attributes = attributes;
  this.content = content;
  this.hooks = hooks;
  this.selfClosing = selfClosing;
  this.notClosed = notClosed;
  this.ns = ns;

  this.startClose = getStartClose(selfClosing);
  this.unescapedContent = false;
}
DynamicElement.prototype = new Element();
DynamicElement.prototype.getTagName = function(context) {
  return getUnescapedValue(this.tagName, context);
};
DynamicElement.prototype.getEndTag = function(tagName) {
  return getEndTag(tagName, this.selfClosing, this.notClosed);
};
DynamicElement.prototype.type = 'DynamicElement';

function getStartClose(selfClosing) {
  return (selfClosing) ? ' />' : '>';
}

function getEndTag(tagName, selfClosing, notClosed) {
  var lowerTagName = tagName && tagName.toLowerCase();
  var isVoid = VOID_ELEMENTS[lowerTagName];
  return (isVoid || selfClosing || notClosed) ? '' : '</' + tagName + '>';
}

function getAttributeValue(element, name) {
  var propertyName = UPDATE_PROPERTIES[name];
  return (propertyName) ? element[propertyName] : element.getAttribute(name);
}

function emitHooks(hooks, context, value) {
  if (!hooks) return;
  for (var i = 0, len = hooks.length; i < len; i++) {
    hooks[i].emit(context, value);
  }
}

function Block(expression, content) {
  this.expression = expression;
  this.ending = '/' + expression;
  this.content = content;
}
Block.prototype = new Template();
Block.prototype.get = function(context, unescaped) {
  var blockContext = context.child(this.expression);
  return contentHtml(this.content, blockContext, unescaped);
};
Block.prototype.appendTo = function(parent, context, binding) {
  var blockContext = context.child(this.expression);
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  parent.appendChild(start);
  appendContent(parent, this.content, blockContext);
  parent.appendChild(end);
  updateRange(context, binding, this, start, end);
};
Block.prototype.attachTo = function(parent, node, context) {
  var blockContext = context.child(this.expression);
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  parent.insertBefore(start, node || null);
  node = attachContent(parent, node, this.content, blockContext);
  parent.insertBefore(end, node || null);
  updateRange(context, null, this, start, end);
  return node;
};
Block.prototype.type = 'Block';
Block.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression, this.content);
};
Block.prototype.update = function(context, binding) {
  // Get start and end in advance, since binding is mutated in getFragment
  var start = binding.start;
  var end = binding.end;
  var fragment = this.getFragment(context, binding);
  replaceRange(context, start, end, fragment, binding);
};

function ConditionalBlock(expressions, contents) {
  this.expressions = expressions;
  this.beginning = expressions.join('; ');
  this.ending = '/' + this.beginning;
  this.contents = contents;
}
ConditionalBlock.prototype = new Block();
ConditionalBlock.prototype.get = function(context, unescaped) {
  var condition = this.getCondition(context);
  if (condition == null) return '';
  var expression = this.expressions[condition];
  var blockContext = context.child(expression);
  return contentHtml(this.contents[condition], blockContext, unescaped);
};
ConditionalBlock.prototype.appendTo = function(parent, context, binding) {
  var start = document.createComment(this.beginning);
  var end = document.createComment(this.ending);
  parent.appendChild(start);
  var condition = this.getCondition(context);
  if (condition != null) {
    var expression = this.expressions[condition];
    var blockContext = context.child(expression);
    appendContent(parent, this.contents[condition], blockContext);
  }
  parent.appendChild(end);
  updateRange(context, binding, this, start, end, null, condition);
};
ConditionalBlock.prototype.attachTo = function(parent, node, context) {
  var start = document.createComment(this.beginning);
  var end = document.createComment(this.ending);
  parent.insertBefore(start, node || null);
  var condition = this.getCondition(context);
  if (condition != null) {
    var expression = this.expressions[condition];
    var blockContext = context.child(expression);
    node = attachContent(parent, node, this.contents[condition], blockContext);
  }
  parent.insertBefore(end, node || null);
  updateRange(context, null, this, start, end, null, condition);
  return node;
};
ConditionalBlock.prototype.type = 'ConditionalBlock';
ConditionalBlock.prototype.serialize = function() {
  return serializeObject.instance(this, this.expressions, this.contents);
};
ConditionalBlock.prototype.update = function(context, binding) {
  var condition = this.getCondition(context);
  if (condition === binding.condition) return;
  binding.condition = condition;
  // Get start and end in advance, since binding is mutated in getFragment
  var start = binding.start;
  var end = binding.end;
  var fragment = this.getFragment(context, binding);
  replaceRange(context, start, end, fragment, binding);
};
ConditionalBlock.prototype.getCondition = function(context) {
  for (var i = 0, len = this.expressions.length; i < len; i++) {
    if (this.expressions[i].truthy(context)) {
      return i;
    }
  }
};

function EachBlock(expression, content, elseContent) {
  this.expression = expression;
  this.ending = '/' + expression;
  this.content = content;
  this.elseContent = elseContent;
}
EachBlock.prototype = new Block();
EachBlock.prototype.get = function(context, unescaped) {
  var items = this.expression.get(context);
  var listContext = context.child(this.expression);
  if (items && items.length) {
    var html = '';
    for (var i = 0, len = items.length; i < len; i++) {
      var itemContext = listContext.eachChild(i);
      html += contentHtml(this.content, itemContext, unescaped);
    }
    return html;
  } else if (this.elseContent) {
    return contentHtml(this.elseContent, listContext, unescaped);
  }
  return '';
};
EachBlock.prototype.appendTo = function(parent, context, binding) {
  var items = this.expression.get(context);
  var listContext = context.child(this.expression);
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  parent.appendChild(start);
  if (items && items.length) {
    for (var i = 0, len = items.length; i < len; i++) {
      var itemContext = listContext.eachChild(i);
      this.appendItemTo(parent, itemContext, start);
    }
  } else if (this.elseContent) {
    appendContent(parent, this.elseContent, listContext);
  }
  parent.appendChild(end);
  updateRange(context, binding, this, start, end);
};
EachBlock.prototype.appendItemTo = function(parent, context, itemFor, binding) {
  var before = parent.lastChild;
  var start, end;
  appendContent(parent, this.content, context);
  if (before === parent.lastChild) {
    start = end = document.createComment('empty');
    parent.appendChild(start);
  } else {
    start = (before && before.nextSibling) || parent.firstChild;
    end = parent.lastChild;
  }
  updateRange(context, binding, this, start, end, itemFor);
};
EachBlock.prototype.attachTo = function(parent, node, context) {
  var items = this.expression.get(context);
  var listContext = context.child(this.expression);
  var start = document.createComment(this.expression);
  var end = document.createComment(this.ending);
  parent.insertBefore(start, node || null);
  if (items && items.length) {
    for (var i = 0, len = items.length; i < len; i++) {
      var itemContext = listContext.eachChild(i);
      node = this.attachItemTo(parent, node, itemContext, start);
    }
  } else if (this.elseContent) {
    node = attachContent(parent, node, this.elseContent, listContext);
  }
  parent.insertBefore(end, node || null);
  updateRange(context, null, this, start, end);
  return node;
};
EachBlock.prototype.attachItemTo = function(parent, node, context, itemFor) {
  var start, end;
  var nextNode = attachContent(parent, node, this.content, context);
  if (nextNode === node) {
    start = end = document.createComment('empty');
    parent.insertBefore(start, node || null);
  } else {
    start = node;
    end = (nextNode && nextNode.previousSibling) || parent.lastChild;
  }
  updateRange(context, null, this, start, end, itemFor);
  return nextNode;
};
EachBlock.prototype.update = function(context, binding) {
  var start = binding.start;
  var end = binding.end;
  if (binding.itemFor) {
    var fragment = document.createDocumentFragment();
    this.appendItemTo(fragment, context, binding.itemFor, binding);
  } else {
    var fragment = this.getFragment(context, binding);
  }
  replaceRange(context, start, end, fragment, binding);
};
EachBlock.prototype.insert = function(context, binding, index, howMany) {
  var items = this.expression.get(context);
  var listContext = context.child(this.expression);
  var node = indexStartNode(binding, index);
  var fragment = document.createDocumentFragment();
  for (var i = index, len = index + howMany; i < len; i++) {
    var itemContext = listContext.eachChild(i);
    this.appendItemTo(fragment, itemContext, binding.start);
  }
  binding.start.parentNode.insertBefore(fragment, node || null);
};
EachBlock.prototype.remove = function(context, binding, index, howMany) {
  var node = indexStartNode(binding, index);
  var i = 0;
  var parent = binding.start.parentNode;
  while (node) {
    var nextNode = node.nextSibling;
    parent.removeChild(node);
    emitRemoved(context, node, binding);
    if (node.$bindEnd && node.$bindEnd.itemFor === binding.start) {
      if (howMany === ++i) return;
    }
    node = nextNode;
  }
};
EachBlock.prototype.move = function(context, binding, from, to, howMany) {
  var node = indexStartNode(binding, from);
  var fragment = document.createDocumentFragment();
  var i = 0;
  while (node) {
    var nextNode = node.nextSibling;
    fragment.appendChild(node);
    if (node.$bindEnd && node.$bindEnd.itemFor === binding.start) {
      if (howMany === ++i) break;
    }
    node = nextNode;
  }
  node = indexStartNode(binding, to);
  binding.start.parentNode.insertBefore(fragment, node || null);
};
EachBlock.prototype.type = 'EachBlock';
EachBlock.prototype.serialize = function() {
  return serializeObject.instance(this, this.expression, this.content, this.elseContent);
};

function indexStartNode(binding, index) {
  var node = binding.start;
  var i = 0;
  while (node = node.nextSibling) {
    if (node === binding.end) return node;
    if (node.$bindStart && node.$bindStart.itemFor === binding.start) {
      if (index === i) return node;
      i++;
    }
  }
}

function updateRange(context, binding, template, start, end, itemFor, condition) {
  if (binding) {
    binding.start = start;
    binding.end = end;
    binding.condition = condition;
    setNodeProperty(start, '$bindStart', binding);
    setNodeProperty(end, '$bindEnd', binding);
  } else {
    context.addBinding(new RangeBinding(template, context, start, end, itemFor, condition));
  }
}

function appendContent(parent, content, context) {
  for (var i = 0, len = content.length; i < len; i++) {
    content[i].appendTo(parent, context);
  }
}
function attachContent(parent, node, content, context) {
  for (var i = 0, len = content.length; i < len; i++) {
    node = content[i].attachTo(parent, node, context);
  }
  return node;
}
function contentHtml(content, context, unescaped) {
  var html = '';
  for (var i = 0, len = content.length; i < len; i++) {
    html += content[i].get(context, unescaped);
  }
  return html;
}
function replaceRange(context, start, end, fragment, binding, innerOnly) {
  var parent = start.parentNode;
  // This shouldn't happen if bindings are cleaned up properly, but check
  // in case they aren't
  if (!parent) return;
  if (start === end) {
    parent.replaceChild(fragment, start);
    emitRemoved(context, start, binding);
    return;
  }
  // Remove all nodes from start to end
  var node = (innerOnly) ? start.nextSibling : start;
  var nextNode;
  while (node) {
    nextNode = node.nextSibling;
    emitRemoved(context, node, binding);
    if (innerOnly && node === end) {
      nextNode = end;
      break;
    }
    parent.removeChild(node);
    if (node === end) break;
    node = nextNode;
  }
  // This also works if nextNode is null, by doing an append
  parent.insertBefore(fragment, nextNode || null);
}
function emitRemoved(context, node, ignore) {
  context.removeNode(node);
  var binding = node.$bindNode;
  if (binding && binding !== ignore) context.removeBinding(binding);
  binding = node.$bindStart;
  if (binding && binding !== ignore) context.removeBinding(binding);
  var attributes = node.$bindAttributes;
  if (attributes) {
    for (var key in attributes) {
      context.removeBinding(attributes[key]);
    }
  }
  for (node = node.firstChild; node; node = node.nextSibling) {
    emitRemoved(context, node, ignore);
  }
}

function attachError(parent, node) {
  if (typeof console !== 'undefined') {
    console.error('Attach failed for', node, 'within', parent);
  }
  return new Error('Attaching bindings failed, because HTML structure ' +
    'does not match client rendering.'
  );
}

function Binding() {
  this.meta = null;
}
Binding.prototype.type = 'Binding';
Binding.prototype.update = function() {
  this.template.update(this.context, this);
};
Binding.prototype.insert = function() {
  this.update();
};
Binding.prototype.remove = function() {
  this.update();
};
Binding.prototype.move = function() {
  this.update();
};

function NodeBinding(template, context, node) {
  this.template = template;
  this.context = context;
  this.node = node;
  this.meta = null;
  setNodeProperty(node, '$bindNode', this);
}
NodeBinding.prototype = new Binding();
NodeBinding.prototype.type = 'NodeBinding';

function AttributeBindingsMap() {}
function AttributeBinding(template, context, element, name) {
  this.template = template;
  this.context = context;
  this.element = element;
  this.name = name;
  this.meta = null;
  var map = element.$bindAttributes ||
    (element.$bindAttributes = new AttributeBindingsMap());
  map[name] = this;
}
AttributeBinding.prototype = new Binding();
AttributeBinding.prototype.type = 'AttributeBinding';

function RangeBinding(template, context, start, end, itemFor, condition) {
  this.template = template;
  this.context = context;
  this.start = start;
  this.end = end;
  this.itemFor = itemFor;
  this.condition = condition;
  this.meta = null;
  setNodeProperty(start, '$bindStart', this);
  setNodeProperty(end, '$bindEnd', this);
}
RangeBinding.prototype = new Binding();
RangeBinding.prototype.type = 'RangeBinding';
RangeBinding.prototype.insert = function(index, howMany) {
  if (this.template.insert) {
    this.template.insert(this.context, this, index, howMany);
  } else {
    this.template.update(this.context, this);
  }
};
RangeBinding.prototype.remove = function(index, howMany) {
  if (this.template.remove) {
    this.template.remove(this.context, this, index, howMany);
  } else {
    this.template.update(this.context, this);
  }
};
RangeBinding.prototype.move = function(from, to, howMany) {
  if (this.template.move) {
    this.template.move(this.context, this, from, to, howMany);
  } else {
    this.template.update(this.context, this);
  }
};


//// Utility functions ////

function noop() {}

function mergeInto(from, to) {
  for (var key in from) {
    to[key] = from[key];
  }
}

function escapeHtml(string) {
  string = string + '';
  return string.replace(/[&<]/g, function(match) {
    return (match === '&') ? '&amp;' : '&lt;';
  });
}

function escapeAttribute(string) {
  string = string + '';
  return string.replace(/[&"]/g, function(match) {
    return (match === '&') ? '&amp;' : '&quot;';
  });
}


//// Shims & workarounds ////

// General notes:
//
// In all cases, Node.insertBefore should have `|| null` after its second
// argument. IE works correctly when the argument is ommitted or equal
// to null, but it throws and error if it is equal to undefined.

if (!Array.isArray) {
  Array.isArray = function(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  };
}

// Equivalent to textNode.splitText, which is buggy in IE <=9
function splitData(node, index) {
  var newNode = node.cloneNode(false);
  newNode.deleteData(0, index);
  node.deleteData(index, node.length - index);
  node.parentNode.insertBefore(newNode, node.nextSibling || null);
  return newNode;
}

// Defined so that it can be overriden in IE <=8
function setNodeProperty(node, key, value) {
  return node[key] = value;
}

function normalizeLineBreaks(string) {
  return string;
}

(function() {
  // Don't try to shim in Node.js environment
  if (typeof document === 'undefined') return;

  var div = document.createElement('div');
  div.innerHTML = '\r\n<br>\n'
  var windowsLength = div.firstChild.data.length;
  var unixLength = div.lastChild.data.length;
  if (windowsLength === 1 && unixLength === 1) {
    normalizeLineBreaks = function(string) {
      return string.replace(/\r\n/g, '\n');
    };
  } else if (windowsLength === 2 && unixLength === 2) {
    normalizeLineBreaks = function(string) {
      return string.replace(/(^|[^\r])(\n+)/g, function(match, value, newLines) {
        for (var i = newLines.length; i--;) {
          value += '\r\n';
        }
        return value;
      });
    };
  }

  // TODO: Shim createHtmlFragment for old IE

  // TODO: Shim setAttribute('style'), which doesn't work in IE <=7
  // http://webbugtrack.blogspot.com/2007/10/bug-245-setattribute-style-does-not.html

  // TODO: Investigate whether input name attribute works in IE <=7. We could
  // override Element::appendTo to use IE's alternative createElement syntax:
  // document.createElement('<input name="xxx">')
  // http://webbugtrack.blogspot.com/2007/10/bug-235-createelement-is-broken-in-ie.html

  // In IE, input.defaultValue doesn't work correctly, so use input.value,
  // which mistakenly but conveniently sets both the value property and attribute.
  //
  // Surprisingly, in IE <=7, input.defaultChecked must be used instead of
  // input.checked before the input is in the document.
  // http://webbugtrack.blogspot.com/2007/11/bug-299-setattribute-checked-does-not.html
  var input = document.createElement('input');
  input.defaultValue = 'x';
  if (input.value !== 'x') {
    CREATE_PROPERTIES.value = 'value';
  }

  try {
    // TextNodes are not expando in IE <=8
    document.createTextNode('').$try = 0;
  } catch (err) {
    setNodeProperty = function(node, key, value) {
      // If trying to set a property on a TextNode, create a proxy CommentNode
      // and set the property on that node instead. Put the proxy after the
      // TextNode if marking the end of a range, and before otherwise.
      if (node.nodeType === 3) {
        var proxyNode;
        if (key === '$bindEnd') {
          proxyNode = node.nextSibling;
          if (!proxyNode || proxyNode.$bindProxy !== node) {
            proxyNode = document.createComment('proxy');
            proxyNode.$bindProxy = node;
            node.parentNode.insertBefore(proxyNode, node.nextSibling || null);
          }
        } else {
          proxyNode = node.previousSibling;
          if (!proxyNode || proxyNode.$bindProxy !== node) {
            proxyNode = document.createComment('proxy');
            proxyNode.$bindProxy = node;
            node.parentNode.insertBefore(proxyNode, node || null);
          }
        }
        return proxyNode[key] = value;
      }
      // Set the property directly on other node types
      return node[key] = value;
    };
  }
})();
