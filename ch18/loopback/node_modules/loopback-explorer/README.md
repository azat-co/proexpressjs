# loopback-explorer

Browse and test your LoopBack app's APIs.

## Basic Usage

Below is a simple LoopBack application. The explorer is mounted at `/explorer`.

```js
var loopback = require('loopback');
var app = loopback();
var explorer = require('../');
var port = 3000;

var Product = loopback.Model.extend('product');
Product.attachTo(loopback.memory());
app.model(Product);

app.use('/explorer', explorer(app, {basePath: '/api'}));
app.use('/api', loopback.rest());
console.log("Explorer mounted at localhost:" + port + "/explorer");

app.listen(port);
```

## Advanced Usage

Many aspects of the explorer are configurable. 

See [options](#options) for a description of these options:

```js
// Mount middleware before calling `explorer()` to add custom headers, auth, etc.
app.use('/explorer', loopback.basicAuth('user', 'password'));
app.use('/explorer', explorer(app, {
  basePath: '/custom-api-root',
  swaggerDistRoot: '/swagger',
  apiInfo: {
    'title': 'My API',
    'description': 'Explorer example app.'
  },
  resourcePath: 'swaggerResources',
  version: '0.1-unreleasable'
}));
app.use('/custom-api-root', loopback.rest());
```

## Options

Options are passed to `explorer(app, options)`.

`basePath`: **String**

> Default: `app.get('restAPIRoot')` or  `'/api'`.

> Sets the API's base path. This must be set if you are mounting your api
> to a path different than '/api', e.g. with
> `loopback.use('/custom-api-root', loopback.rest());

`protocol`: **String**

> Default: `null`

> A hard override for the outgoing protocol (`http` or `https`) that is designated in Swagger
> resource documents. By default, `loopback-explorer` will write the protocol that was used to retrieve
> the doc. This option is useful if, for instance, your API sits behind an SSL terminator
> and thus needs to report its endpoints as `https`, even though incoming traffic is auto-detected
> as `http`.

`swaggerDistRoot`: **String** 

> Sets a path within your application for overriding Swagger UI files.

> If present, will search `swaggerDistRoot` first when attempting to load Swagger UI, allowing
> you to pick and choose overrides to the interface. Use this to style your explorer or
> add additional functionality.

> See [index.html](public/index.html), where you may want to begin your overrides.
> The rest of the UI is provided by [Swagger UI](https://github.com/wordnik/swagger-ui).

`apiInfo`: **Object**

> Additional information about your API. See the 
> [spec](https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#513-info-object).

`resourcePath`: **String**

> Default: `'resources'`

> Sets a different path for the 
> [resource listing](https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#51-resource-listing).
> You generally shouldn't have to change this.

`version`: **String**

> Default: Read from package.json

> Sets your API version. If not present, will read from your app's package.json.
