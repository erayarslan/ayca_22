/**
 * @server app
 */
// Include Required Libraries
var io = require('socket.io').listen(8084);
var loki = require('lokijs');
var db = new loki('db.json');
var express = require('express');

// Init Cache Datas
var clients = {};
var client_ids = {};
// Init DB
var undeliveredMessages = db.addCollection("undeliveredMessages");
// Init Express
var app = express();
// Configure Express
app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});
// Start Express
app.listen(process.env.PORT || 4141);
// Check Exist User with Offline Status
var isExistUser = function (nick) {
  for (var key in client_ids) {
    if (client_ids[key].nick === nick && client_ids[key].online === false) {
      return key;
    }
  }
  return false;
};
// Socket Connection Event
io.sockets.on('connection', function (socket) {
  // New User Event
  socket.on('newUser', function (nick) {
    // Check Exist User
    var existResult = isExistUser(nick);

    if (existResult !== false) {
      delete client_ids[existResult];
      delete clients[existResult];
    }
    // Save New User
    clients[socket.id] = socket;
    client_ids[socket.id] = {
      nick: nick,
      online: true
    };
    // Send New Users Status
    io.sockets.emit("updateUsers", client_ids);
    // Fetch Logon User Undelivered Messages
    var messages = undeliveredMessages.find({to: nick});
    // Send Undelivered Messages
    io.sockets.emit("checkUndeliveredMessages", messages);
    // Delete Sent Undelivered Messages from DB
    for (var i = 0; i < messages.length; i++) {
      undeliveredMessages.remove(messages[i]);
    }
  });
  // Catch Sending Message Event
  socket.on('sendMessage', function (obj) {
    // Fetch Target Users
    for (var i = 0; i < obj.target_ids.length; i++) {
      // Check Target User isOnline?
      if (client_ids[obj.target_ids[i]].online) {
        // Send Message Online Target User
        clients[obj.target_ids[i]].emit("newMessage", {
          nick: client_ids[obj.from_id].nick,
          message: obj.message
        });
      } else {
        // Save Message to DB for Offline Target User
        undeliveredMessages.insert({
          from: client_ids[obj.from_id].nick,
          message: obj.message,
          to: client_ids[obj.target_ids[i]].nick
        });
      }
    }
  });
  // User Disconnect Event
  socket.on('disconnect', function () {
    // Set Offline Disconnected User
    client_ids[socket.id] ? client_ids[socket.id].online = false : 0;
    // Send New Users Status
    io.sockets.emit("updateUsers", client_ids);
  });
});