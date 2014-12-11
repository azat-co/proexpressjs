## Node API

Use this API in the `app.js` file of your server-side Node.js application.

```js
var loopback= require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();
boot(app, __dirname);
```
