var expect = require('expect.js');
var derbyTemplates = require('derby-templates');
var contexts = derbyTemplates.contexts;
var templates = derbyTemplates.templates;
var parsing = require('../lib/index');

var model = {
  data: {
    _page: {
      greeting: 'Howdy!'
    , zero: 0
    , yep: true
    , nope: false
    , nada: null
    , letters: ['A', 'B', 'C']
    , emptyList: []
    , matrix: [[0, 1], [1, 0]]
    , view: 'section'
    , html: '<b>Qua?</b>'
    , tag: 'strong'
    }
  }
};
var contextMeta = new contexts.ContextMeta({});
var controller = {model: model};
var context = new contexts.Context(contextMeta, controller);

describe('Parse and render literal HTML', function() {

  var literalTests = {
    'empty string': ''
  , 'empty div': '<div></div>'
  , 'div with attributes': '<div class="page home" title="Home"></div>'
  , 'text': 'Hi.'
  , 'conditional comment': '<!--[if IE 6]>Yikes!<![endif]-->'
  , 'div containing text': '<div> </div>'
  , 'nested divs': '<div><div></div></div>'
  , 'sibling divs': '<div></div><div></div>'
  , 'input': '<input type="text">'
  , 'self-closing input': '<input type="text" />'
  , 'void and nonvoid elements': '<div><img><br><b>Hi</b></div><br><div></div>'
  , 'HTML5 doctype': '<!DOCTYPE html>'
  , 'HTML4 doctype': '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">'
  , 'XHTML doctype': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">'
  , 'MathML 1.01 doctype': '<!DOCTYPE math SYSTEM "http://www.w3.org/Math/DTD/mathml1/mathml.dtd">'
  , 'html5 basic page': '<!DOCTYPE html><html><head><title></title></head><body><p></p></body></html>'
  , 'page missing end body and html tags': '<!DOCTYPE html><html><head><title></title></head><body><p></p>'
  };

  for (var name in literalTests) {
    test(name, literalTests[name]);
  }
  function test(name, source) {
    it(name, function() {
      var template = parsing.createTemplate(source);
      expect(template.get()).equal(source);
    });
  }

  it('throws on a mismatched closing HTML tag', function() {
    expect(function() {
      parsing.createTemplate('<div><a></div>');
    }).to.throwException();
  });

});

describe('Parse and render dynamic text and blocks', function() {

  function test(source, expected) {
    var template = parsing.createTemplate(source);
    expect(template.get(context)).equal(expected);
  }

  it('value within text', function() {
    test('Say, "{{_page.greeting}}"', 'Say, "Howdy!"');
    test('{{_page.zero}}', '0');
    test('{{_page.nope}}', 'false');
    test('{{_page.yep}}', 'true');
    test('{{_page.nada}}', '');
    test('{{nothing}}', '');
  });

  it('with block', function() {
    test('{{with _page.yep}}yes{{/with}}', 'yes');
    test('{{with _page.nope}}yes{{/with}}', 'yes');
    test('{{with _page.yep}}{{this}}{{/with}}', 'true');
    test('{{with _page.nope}}{{this}}{{/with}}', 'false');
  });

  it('if block', function() {
    test('{{if _page.yep}}yes{{/if}}', 'yes');
    test('{{if _page.yep}}{{this}}{{/if}}', 'true');
    test('{{if _page.nope}}yes{{/if}}', '');
    test('{{if nothing}}yes{{/if}}', '');
  });

  it('unless block', function() {
    test('{{unless _page.yep}}yes{{/unless}}', '');
    test('{{unless _page.nope}}yes{{/unless}}', 'yes');
    test('{{unless _page.nope}}{{this}}{{/unless}}', 'false');
    test('{{unless nothing}}yes{{/unless}}', 'yes');
  });

  it('else block', function() {
    test('{{if _page.yep}}yes{{else}}no{{/if}}', 'yes');
    test('{{if _page.nope}}yes{{else}}no{{/if}}', 'no');
    test('{{if nothing}}yes{{else}}no{{/if}}', 'no');
  });

  it('else if block', function() {
    test('{{if _page.yep}}1{{else if _page.yep}}2{{else}}3{{/if}}', '1');
    test('{{if _page.nope}}1{{else if _page.yep}}2{{else}}3{{/if}}', '2');
    test('{{if _page.nope}}1{{else if _page.yep}}{{this}}{{else}}3{{/if}}', 'true');
    test('{{if _page.nope}}1{{else if _page.nope}}2{{else}}3{{/if}}', '3');
  });

  it('each block', function() {
    test('{{each _page.letters}}{{this}}:{{/each}}', 'A:B:C:');
    test('{{each [1, 2, 3]}}{{this * 2}}{{/each}}', '246');
    test('{{each [1, _page.zero, 3]}}{{this * 2}}{{/each}}', '206');
    test('{{each [2, 1, 0]}}{{_page.letters[this]}}{{/each}}', 'CBA');
    test('{{each _page.matrix[1]}}{{this}}:{{/each}}', '1:0:');
  });

  it('each else block', function() {
    test('{{each _page.letters}}{{this}}:{{else}}Nada{{/each}}', 'A:B:C:');
    test('{{each _page.emptyList}}{{this}}:{{else}}Nada{{/each}}', 'Nada');
    test('{{each nothing}}{{this}}:{{else}}Nada{{/each}}', 'Nada');
  });

  it('nested each blocks', function() {
    test(
      '{{each _page.matrix}}' +
        '{{each this}}' +
          '{{this}}.' +
        '{{/each}};' +
      '{{/each}}'
    , '0.1.;1.0.;'
    );
    test(
      '{{each _page.matrix}}' +
        '{{each this}}' +
          '{{each _page.matrix}}' +
            '{{each this}}' +
              '{{this}}!' +
            '{{/each}}|' +
          '{{/each}}' +
          '{{this}}.' +
        '{{/each}};' +
      '{{/each}}'
    , '0!1!|1!0!|0.' +
      '0!1!|1!0!|1.;' +
      '0!1!|1!0!|1.' +
      '0!1!|1!0!|0.;'
    );
  });

  it('alias to each block', function() {
    test('{{each _page.letters as #letter}}{{#letter}}:{{/each}}', 'A:B:C:');
    test('{{each [1, 2, 3] as #number}}{{#number * 2}}{{/each}}', '246');
    test('{{each [1, _page.zero, 3] as #number}}{{#number * 2}}{{/each}}', '206');
    test('{{each [2, 1, 0] as #number}}{{_page.letters[#number]}}{{/each}}', 'CBA');
    test('{{each _page.matrix[1] as #number}}{{#number}}:{{/each}}', '1:0:');
  });

  it('index alias to each block', function() {
    test('{{each _page.letters as #letter, #i}}{{#i + 1}}:{{#letter}};{{/each}}', '1:A;2:B;3:C;');
  });
});

describe('Parse and render HTML and blocks', function() {
  function test(source, expected) {
    var template = parsing.createTemplate(source);
    expect(template.get(context)).equal(expected);
  }

  it('block within an element attribute', function() {
    test('<div class="{{if _page.yep}}show{{/}}"></div>', '<div class="show"></div>');
  });

  it('unescaped HTML', function() {
    test('<div>{{unescaped _page.html}}</div>', '<div><b>Qua?</b></div>');
  });

  it('dynamic element', function() {
    test('<div><tag is="{{_page.tag}}">Hi</tag></div>', '<div><strong>Hi</strong></div>');
  });
});

describe('View insertion', function() {

  it('can register and find a view', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body', '<div></div>');
    var view = views.find('body');
    expect(view.get(context)).equal('<div></div>');
  });

  describe('inserts a literal view', function() {
    function test(source) {
      it(source, function() {
        var views = new templates.Views();
        context.meta.views = views;
        views.register('body', source);
        views.register('section', '<div></div>');
        var view = views.find('body');
        expect(view.get(context)).equal('<div></div>');
      });
    }
    test('{{view "section"}}');
    test('<view name="section"></view>');
    test('<view name="section" />');
  });

  describe('inserts a dynamic view', function() {
    function test(source) {
      it(source, function() {
        var views = new templates.Views();
        context.meta.views = views;
        views.register('body', source);
        views.register('section', '<div></div>');
        var view = views.find('body');
        expect(view.get(context)).equal('<div></div>');
      });
    }
    test('{{view _page.view}}');
    test('<view name="{{_page.view}}"></view>');
    test('<view name="{{_page.view}}" />');
  });

  describe('inserts a view with literal arguments', function() {
    function test(source) {
      it(source, function() {
        var views = new templates.Views();
        context.meta.views = views;
        views.register('body', source);
        views.register('section', '<div>{{@text}}</div>');
        var view = views.find('body');
        expect(view.get(context)).equal('<div>Hi</div>');
      });
    }
    test('{{view "section", {text: "Hi"}}}');
    test('<view name="section" text="Hi"></view>');
    test('<view name="section" text="Hi" />');
  });

  describe('dashed html view arguments become camel cased', function() {
    function test(source) {
      it(source, function() {
        var views = new templates.Views();
        context.meta.views = views;
        views.register('body', source);
        views.register('section', '<div>{{@messageText}}</div>');
        var view = views.find('body');
        expect(view.get(context)).equal('<div>Hi</div>');
      });
    }
    test('{{view "section", {messageText: "Hi"}}}');
    test('<view name="section" message-text="Hi"></view>');
    test('<view name="section" message-text="Hi" />');
  });

  describe('inserts a view with dynamic arguments', function() {
    function test(source) {
      it(source, function() {
        var views = new templates.Views();
        context.meta.views = views;
        views.register('body', source);
        views.register('section', '<div>{{@text}}</div>');
        var view = views.find('body');
        expect(view.get(context)).equal('<div>Howdy!</div>');
      });
    }
    test('{{view "section", {text: _page.greeting}}}');
    test('<view name="section" text="{{_page.greeting}}"></view>');
    test('<view name="section" text="{{_page.greeting}}" />');
  });

  it('passes HTML inside <view> as {{@content}}', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body', '<view name="section"><b>Hi</b></view>');
    views.register('section', '<div>{{@content}}</div>');
    var view = views.find('body');
    expect(view.get(context)).equal('<div><b>Hi</b></div>');
  });

  it('content can be overridden', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body', '<view name="section" content="Stuff"><b>Hi</b></view>');
    views.register('section', '<div>{{@content}}</div>');
    var view = views.find('body');
    expect(view.get(context)).equal('<div>Stuff</div>');
  });

  it('parent content can be passed through', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body', '<view name="section"><b>Hi</b></view>');
    views.register('section', '<div><view name="paragraph" content="{{@content}}"></view></div>');
    views.register('paragraph', '<p>{{@content}}</p>');
    var view = views.find('body');
    expect(view.get(context)).equal('<div><p><b>Hi</b></p></div>');
  });

  it('views can define custom child attribute tags', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body', '<view name="section"><title><b>Hi</b></title>More text</view>');
    views.register('section', '<h3>{{@title}}</h3><div>{{@content}}</div>', {attributes: 'title'});
    var view = views.find('body');
    expect(view.get(context)).equal('<h3><b>Hi</b></h3><div>More text</div>');
  });

  it('views can define custom child attribute tags', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<view name="section">' +
        '<title><b>Hi</b></title>' +
        'More text' +
      '</view>'
    );
    views.register('section'
    , '<h3>{{@title}}</h3>' +
      '<div>{{@content}}</div>'
    , {attributes: 'title'}
    );
    var view = views.find('body');
    expect(view.get(context)).equal('<h3><b>Hi</b></h3><div>More text</div>');
  });

  it('views can define custom child attribute tags with dashes', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<view name="section">' +
        '<main-title><b>Hi</b></main-title>' +
        'More text' +
      '</view>'
    );
    views.register('section'
    , '<h3>{{@mainTitle}}</h3>' +
      '<div>{{@content}}</div>'
    , {attributes: 'main-title'}
    );
    var view = views.find('body');
    expect(view.get(context)).equal('<h3><b>Hi</b></h3><div>More text</div>');
  });

  it('views support generic attribute tags', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<view name="section">' +
        '<attribute name="title"><b>Hi</b></attribute>' +
        'More text' +
      '</view>'
    );
    views.register('section'
    , '<h3>{{@title}}</h3>' +
      '<div>{{@content}}</div>'
    );
    var view = views.find('body');
    expect(view.get(context)).equal('<h3><b>Hi</b></h3><div>More text</div>');
  });

  it('views can define custom child array tags', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<view name="tabs">' +
        '<pane title="One"><b>Hi</b></pane>' +
        '<pane title="Two">Ho</pane>' +
      '</view>'
    );
    views.register('tabs'
    , '<ul>' +
        '{{each @panes}}' +
          '<li>{{this.title}}</li>' +
        '{{/each}}' +
      '</ul>' +
      '{{each @panes}}' +
        '<div>{{this.content}}</div>' +
      '{{/each}}'
    , {arrays: 'pane/panes'}
    );
    var view = views.find('body');
    expect(view.get(context)).equal(
      '<ul>' +
        '<li>One</li>' +
        '<li>Two</li>' +
      '</ul>' +
      '<div><b>Hi</b></div>' +
      '<div>Ho</div>'
    );
  });

  it('views support generic array tags', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<view name="tabs">' +
        '<array name="panes" title="One"><b>Hi</b></array>' +
        '<array name="panes" title="Two">Ho</array>' +
      '</view>'
    );
    views.register('tabs'
    , '<ul>' +
        '{{each @panes}}' +
          '<li>{{this.title}}</li>' +
        '{{/each}}' +
      '</ul>' +
      '{{each @panes}}' +
        '<div>{{this.content}}</div>' +
      '{{/each}}'
    );
    var view = views.find('body');
    expect(view.get(context)).equal(
      '<ul>' +
        '<li>One</li>' +
        '<li>Two</li>' +
      '</ul>' +
      '<div><b>Hi</b></div>' +
      '<div>Ho</div>'
    );
  });

  it('views inside an each pass through alias context', function() {
    var views = new templates.Views();
    context.meta.views = views;
    views.register('body'
    , '<ol>' +
        '{{each _page.matrix as #row}}' +
          '<view name="row"></view>' +
        '{{/each}}' +
      '</ol>'
    );
    views.register('row'
    , '<li>' +
        '<ol>' +
          '{{each #row as #item}}' +
            '<li>{{#item}}</li>' +
          '{{/each}}' +
        '</ol>' +
      '</li>'
    );
    var view = views.find('body');
    expect(view.get(context)).equal(
      '<ol>' +
        '<li>' +
          '<ol>' +
            '<li>0</li>' +
            '<li>1</li>' +
          '</ol>' +
        '</li>' +
        '<li>' +
          '<ol>' +
            '<li>1</li>' +
            '<li>0</li>' +
          '</ol>' +
        '</li>' +
      '</ol>'
    );
  });

});
