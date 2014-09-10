module.exports = function(Book) {
  Book.buy = function(code, cb) {
    cb(null, 'Processing... ' + code);
  }

  Book.remoteMethod('buy', {accepts: [{http: function(ctx) {
    // HTTP request object as provided by Express.js
    var request = ctx.req;
    console.log(request.param('code'), request.ip, request.hostname)
    return request.param('code');
  }}],
      returns: {arg: 'response', type: 'string'}
    }
  );
};
