var _ = require("underscore");

var UInt8 = {
  length : 1,
  write : function (buf, offset, value) {
    buf.writeUInt8(value, offset);
    return 1;
  },
  read : function (buf, offset, value) {
    return buf.readUInt8(offset);
  },
  coerce : function (val) {
    return val & 0xFF;
  }
};
var UInt16 = {
  length : 2,
  write : function (buf, offset, value) {
    buf.writeUInt16LE(value, offset);
    return 2;
  },
  read : function (buf, offset, value) {
    return buf.readUInt16LE(offset);
  },
  coerce : function (val) {
    return val & 0xFFFF;
  }
};
var UInt32 = {
  length : 4,
  write : function (buf, offset, value) {
    buf.writeUInt32LE(value, offset);
    return 4;
  },
  read : function (buf, offset, value) {
    return buf.readUInt32LE(offset);
  },
  coerce : function (val) {
    return ~~val;
  }
};

var tmpFloat32Array = new Float32Array(1);

var Float32 = {
  length : 4,
  write : function (buf, offset, value) {
    buf.writeFloatLE(value, offset);
    return 4;
  },
  read : function (buf, offset, value) {
    return buf.readFloatLE(offset);
  },
  coerce : function (val) {
    tmpFloat32Array[0] = val;
    return tmpFloat32Array[0];
  }
};

var UFixed2 = {
  length : 2,
  write : function (buf, offset, value) {
    buf.writeUInt16LE(~~(value * 16), offset);
    return 2;
  },
  read : function (buf, offset, value) {
    return buf.readUInt16LE(offset)/16;
  },
  coerce : function (value) {
    return (~~(value * 16)) / 16;
  }
};

var Fixed2 = {
  length : 2,
  write : function (buf, offset, value) {
    buf.writeInt16LE(~~(value * 16), offset);
    return 2;
  },
  read : function (buf, offset, value) {
    return buf.readInt16LE(offset)/16;
  },
  coerce : function (value) {
    return (~~(value * 16)) / 16;
  }
};

exports.UInt8 = UInt8;
exports.UInt16 = UInt16;
exports.UInt32 = UInt32;
exports.Float32 = Float32;
exports.UFixed2 = UFixed2;
exports.Fixed2 = Fixed2;
