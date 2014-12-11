var ExpressRouter = require('../vendor/express/router')
var router = module.exports = require('./router')

router.setup = setup

function setup(app) {
  var routes = []
  ;['get', 'post', 'put', 'del'].forEach(function(method) {
    app[method] = function(pattern, callback) {
      if (router.isTransitional(pattern)) return app
      routes.push([method, pattern, callback])
      return app
    }
  })
  ;['enter', 'exit'].forEach(function(method) {
    app[method] = function() {}
  })

  function pageParams(req) {
    var reqParams = req.params
    var params = {
      url: req.url
    , body: req.body
    , query: req.query
    }
    for (var key in reqParams) {
      params[key] = reqParams[key]
    }
    return params
  }

  // router options default to:
  //   caseSensitive: false
  //   strict: false
  app.router = function(options) {
    var expressRouter = new ExpressRouter(options)

    function middleware(req, res, next) {
      // To avoid naming conflicts just in case
      var _tracksPage = req._tracksPage
      var page = app.createPage(req, res, next)
      page.redirect = function(url, status) {
        // TODO: Appears there is a bug that Express throws when an undefined
        // status is passed. Fix bug and remove this condition
        if (status) {
          res.redirect(url, status)
        } else {
          res.redirect(url)
        }
      }
      req._tracksPage = page
      expressRouter._dispatch(req, res, function(err) {
        req._tracksPage = _tracksPage
        next(err)
      })
    }

    routes.forEach(function(route) {
      var method = route[0]
      var pattern = route[1]
      var callback = route[2]
      // Create a route
      expressRouter.route(method, pattern, function(req, res, next) {
        var page = req._tracksPage
        var params = page.params = pageParams(req)
        return app.onRoute(callback, page, next)
      })
    })

    return middleware
  }

  return routes
}
