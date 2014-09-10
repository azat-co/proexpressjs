/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  json: function (request, response) {
    response.json({time: new Date()})
  },
	'buy-oauth': function (request, response) {
    return res.redirect('https://gum.co/oauthnode');
  }
};

