// This is the model of the game itself.

var _ = require("underscore");
var types = require("./types");

/*************
 * Unit defs *
 *************/

var unit_defs = {};
var unit_def_from_id = {};

function UnitDef(props) {
  this.id = null;
  this.name = null;
  this.width = 32;
  this.length = 32;
  this.mass = 10;
  this.maxThrust = 10;
  this.maxRotationSpeed = 2;
  this.friction = 0.3;
  this.mobile = true;
  _.extend(this, props);
}

function addUnitDef(unitdef) {
  if (unitdef.name === null) {
    throw new Exception("UnitDef has no name");
  }
  var id = _.size(unit_defs) + 1;
  unitdef.id = id;
  unit_defs[unitdef.name] = unitdef;
  unit_def_from_id[id] = unitdef;
}

addUnitDef(new UnitDef({
  name : "basic_mobile"
}));

var UnitDefType = {
  length : 2,
  write : function (buf, offset, value) {
    buf.writeUInt16LE(value.id, offset);
    return 2;
  },
  read : function (buf, offset, value) {
    return unit_def_from_id[buf.readUInt16LE(offset)];
  },
  coerce : function (val) {
    if (typeof val === "string") {
      return  unit_defs[val];
    } else if (typeof val === "number") {
      return unit_def_from_id[val];
    } else {
      return val;
    }
  }
};

/*********
 * Units *
 *********/

function Unit(props) {
  this.id = null;
  this.type = null;
  this.x = null;
  this.y = null;
  this.heading = null;
  this.dx = 0;
  this.dy = 0;
  this.thrust = 0;
  this.rotationSpeed = 0;

  _.extend(this, props);

  this.normalize();
}

Unit.props = [
  { name : "type", "type" : UnitDefType },
  { name : "x", "type" : types.UFixed2 },
  { name : "y", "type" : types.UFixed2 },
  { name : "heading", "type" : types.Float32 },
  { name : "dx", "type" : types.Fixed2 },
  { name : "dy", "type" : types.Fixed2 },
  { name : "thrust", "type" : types.Fixed2 },
  { name : "rotationSpeed", "type" : types.Float32 }
];
_.each(Unit.props, function (prop, id) { prop.id = id+1; });

Unit.generateUpdateBuffer = function (buf, offset, maxBytes, diff) {
  maxBytes--; // for zero-termination
  var len = 0;
  _.each(diff, function (d) {
    if (maxBytes - (offset + len) > 1 + d.prop.type.length) {
      buf.writeUInt8(d.prop.id, offset+len); len += 1;
      len += d.prop.type.write(buf, offset+len, d.updated);
    }
  });
  buf.writeUInt8(0, offset+len); len += 1;
  return len;
};

Unit.readUpdateBuffer = function (buf, offset) {
  var diff = [];
  var len = 0;
  while (true) {
    var id = buf.readUInt8(offset + len); len += 1;
    if (id === 0) break;
    var prop = Unit.props[id-1];
    var v = prop.type.read(buf, offset+len);
    len += prop.type.length;
    diff.push({
      prop : prop,
      updated : v
    });
  }
  return { diff : diff, len : len };
};

Unit.prototype.normalize = function () {
  var that = this;
  _.each(Unit.props, function (prop) {
    if (that[prop.name] !== null) {
      that[prop.name] = prop.type.coerce(that[prop.name]);
    }
  });
};

Unit.prototype.diff = function (source) {
  var diffs = [];
  var dest = this;
  _.each(Unit.props, function (prop) {
    var v1 = dest[prop.name];
    var v2 = source[prop.name];
    if (v1 !== v2) {
      diffs.push({
        prop : prop,
        initial : v1,
        updated : v2
      });
    }
  });
  return diffs;
};
Unit.prototype.updateFromDiff = function (diff) {
  var dest = this;
  _.each(diff, function (d) {
    dest[d.prop.name] = d.updated;
  });
  //dest.normalize();
};
Unit.prototype.step = function () {
  this.x += this.dx;
  this.y += this.dy;
  this.dx += this.thrust * Math.cos(-this.heading);
  this.dy += this.thrust * Math.sin(-this.heading);
  this.heading += this.rotationSpeed;
  this.heading = (2*Math.PI + this.heading) % (2*Math.PI);
  this.dx *= 1 - this.type.friction;
  this.dy *= 1 - this.type.friction;
  this.normalize();
};

/********
 * Game *
 ********/

function Game() {
  this.tick = null;
  this.units = {};
}
Game.prototype.addUnit = function (unit) {
  if (unit.id) {
    this.units[unit.id] = unit;
    unit.game = this;
  } else {
    throw Exception("Missing id");
  }
};
Game.prototype.diff = function (source) {
  var diffs = [];
  var dest = this;

  var source_ids = _.keys(source.units);
  var dest_ids = _.keys(dest.units);

  var now_dead = _.difference(dest_ids, source_ids);
  _.each(now_dead, function (id) {
    diffs.push({
      dtype : "unit",
      action : "remove",
      id : id
    });
  });

  _.each(_.shuffle(source.units), function (s_unit) {
    var d_unit = dest.units[s_unit.id];
    if (d_unit) {
      var u_diff = d_unit.diff(s_unit);
      if (u_diff.length > 0) {
        diffs.push({
          dtype : "unit",
          action : "update",
          id : s_unit.id,
          diff : u_diff
        });
      }
    } else {
      diffs.push({
        dtype : "unit",
        action : "new",
        id : s_unit.id,
        diff : (new Unit()).diff(s_unit)
      });
    }
  });

  return { tick : source.tick, diffs : diffs};
};
Game.prototype.updateFromDiff = function (diff) {
  var dest = this;
  this.tick = diff.tick;
  _.each(diff.diffs, function (d) {
    if (d.dtype === "prop") {
      throw new Exception("Not handled yet");
      dest[d.prop] = d.updated;
    } else if (d.dtype === "unit") {
      if (d.action === "remove") {
        delete dest.units[d.id];
      } else if (d.action === "new") {
        var u = new Unit({id : d.id});
        dest.addUnit(u);
        u.updateFromDiff(d.diff);
      } else if (d.action === "update") {        
        dest.units[d.id].updateFromDiff(d.diff);
      }
    }
  });
};

Game.generateUpdateBuffer = function (buf, offset, maxBytes, diff) {
  var len = 0;
  buf.writeUInt32LE(diff.tick, offset+len); len += 4;
  maxBytes--; // for zero-termination
  _.each(_.shuffle(diff.diffs), function (d) {
    if (d.dtype === "prop") {
      throw new Exception("Not handled yet");
    } else if (d.dtype === "unit") {
      if (d.action === "remove") {
        if (maxBytes - (offset+len) > 3) {
          buf.writeUInt8(1, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
        }
      } else if (d.action === "new") {
        if (maxBytes - (offset+len) > 4) {
          buf.writeUInt8(2, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
          len += Unit.generateUpdateBuffer(buf, offset+len, maxBytes, d.diff);
        }
      } else if (d.action === "update") {
        if (maxBytes - (offset+len) > 4) {
          buf.writeUInt8(3, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
          len += Unit.generateUpdateBuffer(buf, (offset+len), maxBytes, d.diff);
        }
      }
    }
  });
  buf.writeUInt8(0, (offset+len)); len += 1;
  return len;
};
Game.readUpdateBuffer = function (buf, offset) {
  var len = 0;
  var tick = buf.readUInt32LE(offset+len); len += 4;
  var diffs = [];
  while (true) {
    var code = buf.readUInt8(offset+len); len += 1;
    if (code === 0) {
      break;
    } else if (code === 1) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      diffs.push({ dtype : "unit",
                   action : "remove",
                   id : id });
    } else if (code === 2) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      var u = Unit.readUpdateBuffer(buf, offset+len);
      len += u.len;
      diffs.push({ dtype : "unit",
                   action : "new",
                   id : id,
                   diff : u.diff });
    } else if (code === 3) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      var u = Unit.readUpdateBuffer(buf, offset+len);
      len += u.len;
      diffs.push({ dtype : "unit",
                   action : "update",
                   id : id,
                   diff : u.diff }); 
    }
  }
  return { diff : { tick : tick, diffs : diffs }, len : len };
};
Game.prototype.step = function () {
  _.each(this.units, function (unit) {
    unit.step();
  });
  this.tick++;
};

/*********************
 * ServerClientModel *
 *********************/

// Maintains what the server thinks the client knows.
function ServerClientModel(sourceGame) {
  this.sourceGame = sourceGame;
  // And the client knows nothing:
  this.game = new Game();
  this.latency = null;
}
ServerClientModel.prototype.generateUpdateBuffer = function (maxBytes) {
  this.game.step(); // if we let the client update, perhaps fewer things will be different
  var diff = this.game.diff(this.sourceGame);
  var buf = new Buffer(maxBytes);
  var len = 0;
  len += Game.generateUpdateBuffer(buf, 0, maxBytes, diff);
  var diff2 = Game.readUpdateBuffer(buf, 0);
  this.game.updateFromDiff(diff2.diff);
  //this.game.updateFromDiff(diff);
  return {
    buffer : buf,
    length : len
  };
};

/***************
 * ClientModel *
 ***************/

function ClientModel() {
  this.game = new Game();
  this.queuedActions = [];
}
ClientModel.prototype.readUpdateBuffer = function (buf) {
  this.game.step(); // update because diff is w.r.t. updated state
  this.latency = buf.readUInt8(0);
  var ret = Game.readUpdateBuffer(buf, 1);
  /* if (ret.diff.diffs.length > 0 )
    console.log(ret.diff); */
  this.game.updateFromDiff(ret.diff);
};
ClientModel.prototype.queueAction = function (action) {
  this.queuedActions.push(action);
};

/***********
 * Actions *
 ***********/

function UnitMotorAction(uid, thrust, rotationSpeed) {
  this.thrust = thrust;
  this.rotationSpeed = rotationSpeed;
}

exports.Game = Game;
exports.Unit = Unit;
exports.ServerClientModel = ServerClientModel;
exports.ClientModel = ClientModel;
