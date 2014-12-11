# Derby plugin to add Less support

## Usage

Right after creating your Derby app, add:

```js
// Add Less support
app.serverUse(module, 'derby-less');
```

Make sure this is before any calls to `app.loadStyles()`.

After that you can use `*.less` files instead of `*.css`

## Example

index.js
```js
var derby = require('derby');
var app = module.exports = derby.createApp('example', __filename);

// Add Less support (before loadStyles)
app.serverUse(module, 'derby-less');

app.loadViews (__dirname);
app.loadStyles(__dirname);

app.get('/', function(page, model) {
  page.render();
});
```

index.html
```html
<Body:>
  <h1>Hello world</h1>
```

index.less
```less
body{
  padding: 0;
  margin: 0;
}  
```
