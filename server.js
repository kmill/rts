var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    _ = require('underscore'),
    timers = require('timers');

var buffer = require('buffer');
var networking = require('./networking');

//io.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);

io.set('log level', 1);

app.listen(8333);


function handler(req, res) {
  res.end("Welcome.");
}

var model = require("./model.js");
var game = new model.Game();
for (var i = 1; i <= 200; i++) {
  var u = new model.Unit({
    id : game.genId(),
    player : i % 2 + 1,
    type : "basic_mobile",
    health : 20,
    x : Math.random() * 4096,
    y : Math.random() * 4096,
    heading : Math.random() * 2 * Math.PI
  });
  game.addUnit(u);
}

// u = new model.Unit({
//   id : 2,
//   type : "basic_mobile",
//   x : 500,
//   y : 300,
//   heading : 2*Math.PI/3
// });
// game.addUnit(u);
// game.tick = 1;

//console.log((new model.Game()).diff(game).diffs[0].diff);

var users = {};

function makeUser() {
  
}

var known_clients = {};
var next_client_id = 1;

function Client(socket, game) {
  this.id = next_client_id++;
  known_clients[this.id] = this;
  this.socket = socket;

  this.cmodel = new model.ServerClientModel(game);

  this.lastTickResponse = -1;

  this.buf = new Buffer(4096);

  this.bytesPerTick = Math.min(this.buf.length, ~~(30 * 1024 * constants.TICK_INTERVAL / 1000));

  var that = this;
  socket.on('disconnect', function () {
    delete known_clients[that.id];
  });

  socket.on('message', function (message) {
    that.process(message);
  });

}
Client.prototype.sendUpdate = function () {
  var ret = this.cmodel.generateUpdateBuffer(this.bytesPerTick-1);
  this.buf.writeUInt8(Math.min(255, this.cmodel.sourceGame.tick - this.lastTickResponse), 0);
  ret.buffer.copy(this.buf, 1, 0, ret.length);
  var message = networking.bufferToString(this.buf, 0, ret.length+1);
  this.socket.send(message);
};
Client.prototype.process = function (message) {
  networking.stringToBuffer(message, this.buf);
  var offset = 0;
  this.lastTickResponse = this.buf.readUInt32LE(offset); offset += 4;
  
  var ret = model.deserializeActions(this.buf, offset);
  offset += ret.length;
  var actions = ret.actions;

  _.each(actions, function (action) { action.perform(game); });
};

io.sockets.on('connection', function (socket) {
  new Client(socket, game);
});

//var g = new model.Game();
//g.updateFromDiff(g.diff(game));
//console.log(g);

var constants = require("./constants");

//var buf = new Buffer(1024);

function runStep() {
  game.step();
  console.log(_.size(game.units) + " " + _.size(game.projectiles));

  _.each(known_clients, function (client) {
    client.sendUpdate();
  });

  timers.setTimeout(runStep, constants.TICK_INTERVAL);
}

runStep();