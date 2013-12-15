
var db       = require('../modules/db_helpers.js');
var ObjectID = require('mongodb').ObjectID;


// GET /:list_id
//
module.exports = function(req, res) {

  var _id = req.params.list_id;

  if (_id.length != 24) {
    res.send(404, 'Sorry, this url doesn\'t belongs to anything.');
  } else {
    var lists = db.getDb().collection('lists');
    lists.findOne({_id: new ObjectID(_id)}, function(err, list) {
      if (list) {
        res.sendfile('./public/index.html');
      } else {
        res.send(404, 'Sorry, this url doesn\'t belongs to anything.');
      }
    });
  }

};
