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

function UFixed2(fracBinDigits) {
  return {
    length : 2,
    fracBinDigits : fracBinDigits,
    write : function (buf, offset, value) {
      buf.writeUInt16LE(~~(value * (1 << fracBinDigits)), offset);
      return 2;
    },
    read : function (buf, offset, value) {
      return buf.readUInt16LE(offset)/(1 << fracBinDigits);
    },
    coerce : function (value) {
      return ((value * (1 << fracBinDigits)) & 0xFFFF) / (1 << fracBinDigits);
    }
  };
}

function Fixed2(fracBinDigits) {
  return {
    length : 2,
    fracBinDigits : fracBinDigits,
    write : function (buf, offset, value) {
      buf.writeInt16LE(~~(value * (1 << fracBinDigits)), offset);
      return 2;
    },
    read : function (buf, offset, value) {
      return buf.readInt16LE(offset)/(1 << fracBinDigits);
    },
    coerce : function (value) {
      var v2 = ~~(value * (1 << fracBinDigits));

      if (v2 >= 0) v2 = v2 & 0xFFFF;
      else v2 = (v2 & 0xFFFF) | 0xFFFF0000;

      return v2 / (1 << fracBinDigits);
    }
  };
}

function FixedChar(length) {
  return {
    length : length,
    write : function (buf, offset, value) {
      for (var i = 0; i < length; i++) {
        buf[offset+i] = value.charCodeAt(0) || 0;
      }
      return length;
    },
    read : function (buf, offset, value) {
      var val = "";
      for (var i = 0; i < length && buf[offset + i] != 0; i++) {
        val += String.fromCharCode(buf[offset + i]);
      }
      return val;
    },
    coerce : function (value) {
      return value.slice(0, length);
    }
  };
}

exports.UInt8 = UInt8;
exports.UInt16 = UInt16;
exports.UInt32 = UInt32;
exports.Float32 = Float32;
exports.UFixed2 = UFixed2;
exports.Fixed2 = Fixed2;
exports.FixedChar = FixedChar;
