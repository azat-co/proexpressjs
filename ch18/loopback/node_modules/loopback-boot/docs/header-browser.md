## Browser API

Use this API in the `app.js` file that you process by browserify and run in the browser.

```js
var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();
boot(app);
```
