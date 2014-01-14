var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    _ = require('underscore'),
    timers = require('timers');

var buffer = require('buffer');

app.listen(8333);


function handler(req, res) {
  res.end("Welcome.");
}

io.sockets.on('connection', function (socket) {
  console.log("connected");
  socket.on('my message', function (message) {
    console.log("message: " + message);
  });
  socket.on("disconnect", function () {
    console.log("disconnected");
    clearInterval(interval);
  });

  var interval = setInterval(function () {
    socket.send("hi client. " + (new Date()).getTime());
  }, 5000);
});
