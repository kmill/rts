// This is the model of the game itself.

var _ = require("underscore");
var types = require("./types");
var vect = require("./vect");

function normalize(o) {
  _.each(o.constructor.props, function (prop) {
    if (o[prop.name] !== null) {
      o[prop.name] = prop.type.coerce(o[prop.name]);
    }
  });
}

/*************
 * Unit defs *
 *************/

var unit_defs = {};
var unit_def_from_id = {};

function UnitDef(props) {
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    name : null,
    bounds : [{x : -16, y : -16},
              {x : 16, y : 16}],
    mass : 10,
    maxThrust : 5,
    minThrust : -5,
    maxRotationSpeed : 0.4,
    friction : 0.3,
    mobile : true,
    draw : function (canvas) {
      canvas.c.save();
      canvas.c.fillStyle = "#000";
      canvas.c.beginPath();
      canvas.c.fillRect(this.bounds[0].x, this.bounds[0].y,
                        this.bounds[1].x - this.bounds[0].x,
                        this.bounds[1].y - this.bounds[0].y);
      canvas.c.stroke();
      canvas.c.restore();
    }
  });
}

function addUnitDef(unitdef) {
  if (unitdef.name === null) {
    throw new Error("UnitDef has no name");
  }
  var id = _.size(unit_defs) + 1;
  unitdef.id = id;
  unit_defs[unitdef.name] = unitdef;
  unit_def_from_id[id] = unitdef;
}

addUnitDef(new UnitDef({
  name : "basic_mobile",
  bounds : [{x : -5, y : -5},
            {x : 10, y : 5}],
  draw : function (canvas) {
    canvas.c.save();
    canvas.c.strokeStyle = "#000";
    canvas.c.lineWidth = 1;
    canvas.c.beginPath();
    canvas.c.moveTo(10, 0);
    canvas.c.lineTo(-5, -5);
    canvas.c.lineTo(-5, 5);
    canvas.c.lineTo(10, 0);
    canvas.c.stroke();
    canvas.c.restore();
  }
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
      var def = unit_defs[val];
      if (def === void 0) {
        throw new Error("No such unit def: " + val);
      }
      return def;
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
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    type : null,
    x : null,
    y : null,
    heading : null,
    dx : 0,
    dy : 0,
    thrust : 0,
    rotationSpeed : 0
  });

  this.normalize();
}

Unit.props = [
  { name : "type", "type" : UnitDefType },
  { name : "x", "type" : types.UFixed2(4) },
  { name : "y", "type" : types.UFixed2(4) },
  { name : "heading", "type" : types.Fixed2(10) },
  { name : "dx", "type" : types.Fixed2(6) },
  { name : "dy", "type" : types.Fixed2(6) },
  { name : "thrust", "type" : types.Fixed2(6) },
  { name : "rotationSpeed", "type" : types.Fixed2(10) }
];
_.each(Unit.props, function (prop, id) { prop.id = id+1; });

Unit.prototype.copy = function () {
  var u = new Unit(_.pick(this, _.pluck(Unit.props, "name")));
  u.id = this.id;
  return u;
};

Unit.generateUpdateBuffer = function (buf, offset, maxBytes, diff) {
  maxBytes--; // for zero-termination
  var len = 0;
  _.each(diff, function (d) {
    if (maxBytes - (offset + len) >= 1 + d.prop.type.length) {
      buf.writeUInt8(d.prop.id, offset+len); len += 1;
      try {
        len += d.prop.type.write(buf, offset+len, d.updated);
      } catch (x) {
        console.log(d);
        throw x;
      }
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
  normalize(this);
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
  this.dx += this.thrust * Math.cos(this.heading);
  this.dy += this.thrust * Math.sin(this.heading);
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
  this.tick = 0;
  this.units = {};
}

Game.prototype.copy = function () {
  var g = new Game();
  g.tick = this.tick;
  _.each(this.units, function (unit) {
    g.addUnit(unit.copy());
  });
  return g;
};

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
        if (maxBytes - (offset+len) >= 3) {
          buf.writeUInt8(1, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
        }
      } else if (d.action === "new") {
        if (maxBytes - (offset+len) >= 4) {
          buf.writeUInt8(2, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
          len += Unit.generateUpdateBuffer(buf, offset+len, maxBytes, d.diff);
        }
      } else if (d.action === "update") {
        if (maxBytes - (offset+len) >= 4) {
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
  this.unacknowledgedActions = {};
}
ClientModel.prototype.readUpdateBuffer = function (buf) {
  this.latency = buf.readUInt8(0);
  this.acknowledge(this.game.tick - this.latency);
  this.game.step(); // update because diff is w.r.t. updated state
  var ret = Game.readUpdateBuffer(buf, 1);
  this.game.updateFromDiff(ret.diff);
};
ClientModel.prototype.queueAction = function (action) {
  action.tick = this.game.tick;
  this.queuedActions.push(action);
};
ClientModel.prototype.writeActions = function (buf, offset, maxLength) {
  var len = 0;
  _.each(this.queuedActions, function (action) {
    len += types.UInt8.write(buf, offset+len, action.constructor.id);
    _.each(action.constructor.props, function (prop) {
      len += prop.type.write(buf, offset+len, action[prop.name]);
    });
  });
  len += types.UInt8.write(buf, offset+len, 0);

  this.unacknowledgedActions[this.game.tick] = this.queuedActions;
  this.queuedActions = [];
  return len;
};
ClientModel.readActions = function (buf, offset) {
  return deserializeActions(buf, offset);
};
ClientModel.prototype.acknowledge = function (throughTick) {
  var self = this;
  var latency = 0;
  _.each(_.keys(self.unacknowledgedActions), function (tick) {
    tick = +tick;
    if (tick <= throughTick) {
      latency += 1;
      delete self.unacknowledgedActions[tick];
    }
  });
  return latency;
};
ClientModel.prototype.predictGame = function () {
  var self = this;
  var g = this.game.copy();
  var unackTicks = _.map(_.keys(this.unacknowledgedActions), function (v) { return +v; });
  unackTicks.sort(function (a, b) { return a - b; });
  var steps = 0;
  _.each(unackTicks, function (tick) {
    _.each(self.unacknowledgedActions[tick], function (action) {
      action.perform(g);
    });
    g.step();
    steps += 1;
  });
  //console.log("predicting: " + steps);
  return g;
};

/***********
 * actions *
 ***********/

var action_types = {};
function addActionType(at) {
  var id = _.size(action_types) + 1;
  at.id = id;
  action_types[id] = at;
}

function UnitThrustAction(props) {
  _.extend(this, props);
  _.defaults(this, {
    uid : null,
    thrust : 0
  });
  normalize(this);
}
addActionType(UnitThrustAction);
UnitThrustAction.props = [
  { name : "uid", type : types.UInt16 },
  { name : "thrust", type : types.Fixed2(6) }
];

UnitThrustAction.prototype.perform = function (game) {
  var unit = game.units[this.uid];
  if (unit) {
    unit.thrust = this.thrust;
    if (unit.thrust > unit.type.maxThrust) {
      unit.thrust = unit.type.maxThrust;
    }
    if (unit.thrust < unit.type.minThrust) {
      unit.thrust = unit.type.minThrust;
    }
  }
};

function UnitRotationAction(props) {
  _.extend(this, props);
  _.defaults(this, {
    uid : null,
    rotationSpeed : 0
  });
  normalize(this);
}
addActionType(UnitRotationAction);
UnitRotationAction.props = [
  { name : "uid", type : types.UInt16 },
  { name : "rotationSpeed", type : types.Fixed2(10) }
];

UnitRotationAction.prototype.perform = function (game) {
  var unit = game.units[this.uid];
  if (unit) {
    unit.rotationSpeed = this.rotationSpeed;
    if (unit.rotationSpeed > unit.type.maxRotationSpeed) {
      unit.rotationSpeed = unit.type.maxRotationSpeed;
    }
    if (unit.rotationSpeed < -unit.type.maxRotationSpeed) {
      unit.rotationSpeed = -unit.type.maxRotationSpeed;
    }
  }
};

function serializeActions(buf, offset, actions) {
}
function deserializeActions(buf, offset) {
  var len = 0;
  var actions = [];
  while (true) {
    var aid = types.UInt8.read(buf, offset+len); len += 1;
    if (aid === 0) break;
    var action = new (action_types[aid])();
    _.each(action.constructor.props, function (prop) {
      action[prop.name] = prop.type.read(buf, offset+len);
      len += prop.type.length;
    });
    actions.push(action);
  }
  return {
    len : len,
    actions : actions
  };
}

exports.Game = Game;
exports.Unit = Unit;
exports.ServerClientModel = ServerClientModel;
exports.ClientModel = ClientModel;

exports.deserializeActions = deserializeActions;
exports.UnitThrustAction = UnitThrustAction;
exports.UnitRotationAction = UnitRotationAction;
