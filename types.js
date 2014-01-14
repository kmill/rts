var _ = require("underscore");

var typeLengths = {
  uint8 : 1,
  uint16 : 2,
  uint32 : 4,
  float : 4
};

function typeLength(name) {
  if (_.has(typeLengths, name)) {
    return typeLengths[name];
  } else {
    throw Exception(name);
  }
}

var buf = new Buffer(16);
function coerce(val, type) {
  write(buf, 0, type, val);
  return read(buf, 0, type).val;
}

function write(buf, offset, type, value) {
  switch (type) {
  case "uint8" :
    buf.writeUInt8(value, offset);
    return 1;
  case "uint16" :
    buf.writeUInt16LE(value, offset);
    return 2;
  case "uint32" :
    buf.writeUInt32LE(value, offset);
    return 4;
  case "float" :
    buf.writeFloatLE(value, offset);
    return 4;
  default :
    throw Exception(type);
  }
}
function read(buf, offset, type) {
  switch (type) {
  case "uint8" :
    return {
      val : buf.readUInt8(offset),
      len : 1
    };
  case "uint16" :
    return {
      val : buf.readUInt16LE(offset),
      len : 2
    };
  case "uint32" :
    return {
      val : buf.readUInt32LE(offset),
      len : 4
    };
  case "float" :
    return {
      val : buf.readFloatLE(offset),
      len : 4
    };
  default :
    throw Exception(type);
  }
}

exports.typeLength = typeLength;
exports.write = write;
exports.read = read;
exports.coerce = coerce;
