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
var u = new model.Unit({
  id : 1,
  type : "basic_mobile",
  x : 200,
  y : 200,
  heading : 0
});
game.addUnit(u);

u = new model.Unit({
  id : 2,
  type : "basic_mobile",
  x : 500,
  y : 300,
  heading : 2*Math.PI/3
});
game.addUnit(u);
game.tick = 1;

console.log((new model.Game()).diff(game).diffs[0].diff);

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

  this.buf = new Buffer(2048);

  this.bytesPerTick = 30 * 1024 * constants.TICK_INTERVAL / 1000;

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
  
  /* nonsense */

  var dir = this.buf.readUInt8(offset);
  offset += 1;
  var ids_length = this.buf.readUInt16LE(offset);
  offset += 2;
  var ids = [];
  for (var i = 0; i < ids_length; i++) {
    ids.push(this.buf.readUInt16LE(offset));
    offset += 2;
  }

  _.each(ids, function (id) {
    var unit = _.filter(game.units, function (u) {
      return u.id === id;
    })[0];
    if (typeof unit === "undefined") {
      return;
    }
    if (dir & 1) {
      unit.rotationSpeed = 0.1;
    } else if (dir & 4) {
      unit.rotationSpeed = -0.1;
    } else {
      unit.rotationSpeed = 0;
    }
    if (dir & 2) {
      unit.thrust = 5;
    } else if (dir & 8) {
      unit.thrust = -5;
    } else {
      unit.thrust = 0;
    }
  });
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

  _.each(known_clients, function (client) {
    client.sendUpdate();
  });

  timers.setTimeout(runStep, constants.TICK_INTERVAL);
}

runStep();