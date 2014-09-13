var path = require('path'),
  derby = require('derby'),
  app = derby.createApp('derby-app', __filename);

module.exports = app;
app.serverUse(module, 'derby-less');
app.loadViews (path.join(__dirname, 'views', 'derby-app'));
app.loadStyles(path.join(__dirname, 'styles', 'derby-app'));

app.get('/', function(page, model, params) {
  model.subscribe('d.message', function() {
    page.render();
  });
});

app.proto.create = function(model) {
  model.on('set', 'd.message', function(path, object) {
    console.log('message has been changed: ' + object);
  });
};