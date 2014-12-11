'use strict';

// Refactoring of inline script from index.html.
/*global SwaggerUi, log, ApiKeyAuthorization, hljs, window, $ */
$(function() {
  $.getJSON('config.json', function(config) {
      log(config);
      loadSwaggerUi(config);
  });

  var accessToken;
  function loadSwaggerUi(config) {
    window.swaggerUi = new SwaggerUi({
      url: config.url || '/swagger/resources',
      apiKey: '',
      dom_id: 'swagger-ui-container',
      supportHeaderParams: true,
      supportedSubmitMethods: ['get', 'post', 'put', 'delete'],
      onComplete: function(swaggerApi, swaggerUi) {
        log('Loaded SwaggerUI');
        log(swaggerApi);
        log(swaggerUi);
        $('pre code').each(function(i, e) {hljs.highlightBlock(e); });
      },
      onFailure: function(data) {
        log('Unable to Load SwaggerUI');
        log(data);
      },
      docExpansion: 'none'
    });

    $('#explore').click(setAccessToken);
    $('#api_selector').submit(setAccessToken);
    $('#input_accessToken').keyup(onInputChange);

    window.swaggerUi.load();
  }

  function setAccessToken(e) {
    e.stopPropagation(); // Don't let the default #explore handler fire
    e.preventDefault();
    var key = $('#input_accessToken')[0].value;
    log('key: ' + key);
    if(key && key.trim() !== '') {
      log('added accessToken ' + key);
      window.authorizations.add('key', new ApiKeyAuthorization('access_token', key, 'query'));
      accessToken = key;
      $('.accessTokenDisplay').text('Token Set.').addClass('set');
      $('.accessTokenDisplay').attr('data-tooltip', 'Current Token: ' + key);
    }
  }

  function onInputChange(e) {
    var el = e.currentTarget;
    var key = $(e.currentTarget)[0].value;
    if (!key || key.trim === '') return;
    if (accessToken !== key) {
      $('.accessTokenDisplay').text('Token changed; submit to confirm.');
    } else {
      $('.accessTokenDisplay').text('Token Set.');
    }
  }
});


