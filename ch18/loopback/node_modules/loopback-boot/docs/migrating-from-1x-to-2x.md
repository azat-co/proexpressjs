## Migrating from 1.x to 2.x

**Starting point: a sample 1.x project**

*models.json*

```json
{
  "car": {
    "properties": {
      "color": "string",
    },
    "dataSource": "db"
  }
}
```

*models/car.js*

```js
var app = require('../app');
var Car = app.models.Car;

Car.prototype.honk = function(duration, cb) {
  // make some noise for `duration` seconds
  cb();
};
```

*app.js*
```js
var loopback = require('loopback');
var boot = require('loopback-boot');
var app = loopback();
boot(app, __dirname);
```

### App settings

The files with applications settings were renamed from `app.*` to `config.*`.
Rename the following files to upgrade a 1.x project for loopback-boot 2.x:

  - `app.json` to `config.json`
  - `app.local.json` to `config.local.json`
  - `app.local.js` to `config.local.js`
  - etc.

### Data sources

The configuration of data sources remains the same in both 1.x and 2.x
versions.

### Models

**The 2.x version of loopback-boot no longer creates Models, it's up to the
developer to create them before booting the app.**

The folder `models/` has a different semantincs in 2.x than in 1.x. Instead
of extending Models already defined by `app.boot` and `models.json`,
it provides a set of Model definitions that do not depend on
any application that may use them.

Perform the following steps to update a 1.x project for loopback-boot 2.x.
All code samples are referring to the sample project described above.

 1. Move all Model-definition metadata from `models.json`
 to new per-model json files in `models/` directory.

  *models/car.json*

  ```json
    {
      "name": "car",
      "properties": {
        "color": "string",
      }
    }
  ```

  *models.json*

  ```json
    {
      "car": {
        "dataSource": "db"
      }
    }
  ```

 2. Change per-model javascript files to export a function that adds
 custom methods to the model class.

  *models/car.js*

  ```js
    module.exports = function(Car, Base) {
      Car.prototype.honk = function(duration, cb) {
        // make some noise for `duration` seconds
        cb();
      };
    };
  ```

 3. If your model definitions are not in `./models`, then add an entry
  to `models.json` to specify the paths where to look for model definitions.

  *models.json*

  ```json
  {
      "_meta": {
        "sources": ["./custom/path/to/models"]
      },
      "Car": {
        "dataSource": "db"
      }
  }
  ```

### Attaching built-in models

Models provided by LoopBack, such as `User` or `Role`, are no longer
automatically attached to default data-sources. The data-source configuration
entry `defaultForType` is silently ignored.

You have to explicitly configure all built-in models used by your application
in the `models.json` file.

```
{
  "Role": { "dataSource": "db" }
}
```
