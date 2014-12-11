## Changes in version 1.0

 - New options: `modelsRootDir`, `dsRootDir`

 - Load configuration from files, support dynamic (scripted) options

    ```sh
    app.json, app.local.*, app.{env}.*
    datasources.json, datasources.local.*, datasources.{env}.*
    ```

 - Scripts in `models/` and `boot/` can export `function(app)`,
   this function is then called by the bootstrapper. The existing code
   using `var app = require('../app')` will continue to work.
