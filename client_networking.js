var socket = io.connect('//rts.kylem.net');
var networking = require("./networking");
var buffer = require('buffer');
var _ = require('underscore');

var buf = new Buffer(4096);

var listeners = [];
function register(l) {
  listeners.push(l);
}

var connected = false;

socket.on('connect', function () {
  connected = true;
});

socket.on('message', function (message) {
  wstats.record(networking.getUTF8Size(message));
  networking.stringToBuffer(message, buf);
  _.each(listeners, function (l) {
    function send(buf, start, end) {
      var message = networking.bufferToString(buf, start, end);
      wstats.recordSend(networking.getUTF8Size(message));
      socket.send(message);
    }
    l(send, buf);
  });
});

socket.on('disconnect', function () {
  connected = false;
});

function isConnected() { return connected; }

function reconnect() {
  if (!connected) {
    socket.socket.reconnect();
  }
}

var wstats = new WebsocketStats();
wstats.setMode(0);
wstats.domElement.style.position = 'absolute';
wstats.domElement.style.right = '0px';
wstats.domElement.style.top = '50px';
$(function () { document.body.appendChild(wstats.domElement); });
window.wstats = wstats;

exports.register = register;
exports.isConnected = isConnected;
exports.reconnect = reconnect;