// Utilities for networking on both sides

var buffer = require('buffer');

function getUTF8Size(str) {
  var sizeInBytes = str.split('')
        .map(function (ch) {
          return ch.charCodeAt(0) < 128 ? 1 : 2;
        })
        .reduce(function( curr, next ) {
          return curr + next;
        });
  return sizeInBytes;
};

function bufferToString(buf, start, end) {
  var out = "";
  for (; start < end; start++) {
    out += String.fromCharCode(buf[start]);
  }
  return out;
}

function stringToBuffer(s, buf) {
  for (var i = 0; i < s.length; i++) {
    buf[i] = s.charCodeAt(i);
  }
}

exports.getUTF8Size = getUTF8Size;
exports.bufferToString = bufferToString;
exports.stringToBuffer = stringToBuffer;
