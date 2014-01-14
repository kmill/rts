var socket = io.connect('http://rts.kylem.net');
var networking = require("./networking");
var buffer = require('buffer');
var _ = require('underscore');

var buf = new Buffer(1024);

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
  _.each(listeners, function (l) { l(socket, buf); });
});

socket.on('disconnect', function () {
  connected = false;
});

function isConnected() { return connected; }

var wstats = new WebsocketStats();
wstats.setMode(0);
wstats.domElement.style.position = 'absolute';
wstats.domElement.style.right = '0px';
wstats.domElement.style.top = '50px';
$(function () { document.body.appendChild(wstats.domElement); });
window.wstats = wstats;

exports.register = register;
exports.isConnected = isConnected;