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
    hp : 10,
    mass : 10,
    maxThrust : 5,
    minThrust : -5,
    maxRotationSpeed : 0.4,
    friction : 0.3,
    mobile : true,
    draw : function (unit, canvas, timestamp) {
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


function ProjectileDef(props) {
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    name : null,
    ballistic : false,
    maxDist : 50,
    damage : 1,
    draw : function (unit, canvas, timestamp) {
      canvas.c.save();
      canvas.c.fillStyle = "#000";
      canvas.c.beginPath();
      canvas.c.fillRect(-2, -2, 4, 4);
      canvas.c.stroke();
      canvas.c.restore();
    }
  });
}

var projectile_defs = {};
var projectile_def_from_id = {};

function addProjectileDef(projectileDef) {
  if (projectileDef.name === null) {
    throw new Error("ProjectileDef has no name");
  }
  var id = _.size(projectile_defs) + 1;
  projectileDef.id = id;
  projectile_defs[projectileDef.name] = projectileDef;
  projectile_def_from_id[id] = projectileDef;
}

addProjectileDef(new ProjectileDef({
  name : "energy_ball",
  damage : 1,
  draw : function (projectile, canvas, timestamp) {
    canvas.c.save();
    canvas.c.strokeStyle = "#e90";
    canvas.c.fillStyle = "#ee0";
    canvas.c.beginPath();
    canvas.c.arc(0, 0, 2, 0, Math.PI * 2, false);
    canvas.c.fill();
    canvas.c.stroke();
    canvas.c.restore();
  }
}));

addUnitDef(new UnitDef({
  name : "basic_mobile",
  hp : 20,
  bounds : [{x : -5, y : -5},
            {x : 10, y : 5}],
  minThrust : 0,
  draw : function (unit, canvas, timestamp) {
    canvas.c.save();
    canvas.c.fillStyle = "#ccc";
    if (unit.player == 1) {
      canvas.c.fillStyle = "#33f";
    } else if (unit.player == 2) {
      canvas.c.fillStyle = "#f33";
    }
    canvas.c.strokeStyle = "#000";
    canvas.c.lineWidth = 1;
    canvas.c.beginPath();
    canvas.c.moveTo(10, 0);
    canvas.c.lineTo(-5, -5);
    canvas.c.lineTo(-5, 5);
    canvas.c.lineTo(10, 0);
    canvas.c.fill();
    canvas.c.stroke();
    if (unit.thrust > 0) {
      canvas.c.strokeStyle = "#ff0";
      canvas.c.beginPath();
      canvas.c.moveTo(-6, -3);
      canvas.c.lineTo(-6 - unit.thrust*1.8, 0);
      canvas.c.lineTo(-6, 3);
      canvas.c.stroke();
      canvas.c.strokeStyle = "#f00";
      canvas.c.beginPath();
      canvas.c.moveTo(-6, -3);
      canvas.c.lineTo(-6 - unit.thrust*0.8, 0);
      canvas.c.lineTo(-6, 3);
      canvas.c.stroke();
    }
    if (unit.rotationSpeed > 0) {
      canvas.c.strokeStyle = "#ff0";
      canvas.c.beginPath();
      canvas.c.moveTo(6, -2.5);
      canvas.c.lineTo(7, -2 - unit.rotationSpeed*8);
      canvas.c.lineTo(8, -2);
      canvas.c.stroke();
      canvas.c.strokeStyle = "#f00";
      canvas.c.beginPath();
      canvas.c.moveTo(7, -2);
      canvas.c.lineTo(7, -2 - unit.rotationSpeed*4);
      canvas.c.stroke();
    }
    if (unit.rotationSpeed < 0) {
      canvas.c.strokeStyle = "#ff0";
      canvas.c.beginPath();
      canvas.c.moveTo(6, 2.5);
      canvas.c.lineTo(7, 2 - unit.rotationSpeed*8);
      canvas.c.lineTo(8, 2);
      canvas.c.stroke();
      canvas.c.strokeStyle = "#f00";
      canvas.c.beginPath();
      canvas.c.moveTo(7, 2);
      canvas.c.lineTo(7, 2 - unit.rotationSpeed*4);
      canvas.c.stroke();
    }
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

var ProjectileDefType = {
  length : 2,
  write : function (buf, offset, value) {
    buf.writeUInt16LE(value.id, offset);
    return 2;
  },
  read : function (buf, offset, value) {
    return projectile_def_from_id[buf.readUInt16LE(offset)];
  },
  coerce : function (val) {
    if (typeof val === "string") {
      var def = projectile_defs[val];
      if (def === void 0) {
        throw new Error("No such projectile def: " + val);
      }
      return def;
    } else if (typeof val === "number") {
      return projectile_def_from_id[val];
    } else {
      return val;
    }
  }
};

/***********
 * Players *
 ***********/

function Player(props) {
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    name : null,
    color : null
  });
}

Player.props = [
  { name : "name", "type" : types.FixedChar(16) },
  { name : "color", "type" : types.UInt32 }
];

/*********
 * Units *
 *********/

function Unit(props) {
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    type : null,
    player : null,
    health : null,
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
  { name : "player", "type" : types.UInt8 },
  { name : "health", "type" : types.UFixed2(4) },
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
  if (this.type !== null) {
    this.x += this.dx;
    this.y += this.dy;
    this.dx += this.thrust * Math.cos(this.heading);
    this.dy += this.thrust * Math.sin(this.heading);
    this.heading += this.rotationSpeed;
    this.heading = (2*Math.PI + this.heading) % (2*Math.PI);
    this.dx *= 1 - this.type.friction;
    this.dy *= 1 - this.type.friction;
    
    var collisions = this.game.quadtree.lookup(this, 10);
    _.each(collisions, function (cunit) {
    var dist = vect.dist(this, cunit);
      if (cunit !== this && dist < 10) {
        var dv = vect.unit(this, cunit);
        this.dx = this.dx/2 - dv.x / dist * 10;
        this.dy = this.dy/2 - dv.y / dist * 10;
      }
    }, this);
  }
  this.normalize();
};

Unit.prototype.fire = function () {
  this.game.addProjectile(new Projectile({
    id : this.game.genId(),
    type : "energy_ball",
    owner : this.id,
    x : this.x,
    y : this.y,
    dx : this.dx + 10 * Math.cos(this.heading),
    dy : this.dy + 10 * Math.sin(this.heading)
  }));
};

/***************
 * Projectiles *
 ***************/

function Projectile(props) {
  _.extend(this, props);
  _.defaults(this, {
    id : null,
    type : null,
    owner : null,
    x : null,
    y : null,
    dx : 0,
    dy : 0,
    dist : 0
  });

  this.normalize();
}

Projectile.props = [
  { name : "type", "type" : ProjectileDefType },
  { name : "owner", "type" : types.UInt16 },
  { name : "x", "type" : types.UFixed2(4) },
  { name : "y", "type" : types.UFixed2(4) },
  { name : "dx", "type" : types.Fixed2(6) },
  { name : "dy", "type" : types.Fixed2(6) },
  { name : "dist", "type" : types.Fixed2(4) }
];
_.each(Projectile.props, function (prop, id) { prop.id = id+1; });

Projectile.prototype.copy = function () {
  var u = new Projectile(_.pick(this, _.pluck(Projectile.props, "name")));
  u.id = this.id;
  return u;
};

Projectile.generateUpdateBuffer = function (buf, offset, maxBytes, diff) {
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

Projectile.readUpdateBuffer = function (buf, offset) {
  var diff = [];
  var len = 0;
  while (true) {
    var id = buf.readUInt8(offset + len); len += 1;
    if (id === 0) break;
    var prop = Projectile.props[id-1];
    var v = prop.type.read(buf, offset+len);
    len += prop.type.length;
    diff.push({
      prop : prop,
      updated : v
    });
  }
  return { diff : diff, len : len };
};

Projectile.prototype.normalize = function () {
  normalize(this);
};

Projectile.prototype.diff = function (source) {
  var diffs = [];
  var dest = this;
  _.each(Projectile.props, function (prop) {
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
Projectile.prototype.updateFromDiff = function (diff) {
  var dest = this;
  _.each(diff, function (d) {
    dest[d.prop.name] = d.updated;
  });
  //dest.normalize();
};
Projectile.prototype.step = function () {
  if (this.type !== null) {
    this.x += this.dx;
    this.y += this.dy;
    this.dist += Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    
    var collisions = this.game.quadtree.lookup(this, 10);
    _.each(collisions, function (unit) {
      var dist = vect.dist(this, unit);
      if (unit.id !== this.owner && dist < 10) {
        unit.dx += this.dx * 0.05;
        unit.dy += this.dy * 0.05;
        unit.health -= this.type.damage;
        if (unit.health === 0) {
          delete this.game.units[unit.id];
        }
        delete this.game.projectiles[this.id];
        return;
      }
    }, this);

    if (this.dist >= this.type.maxDist) {
      delete this.game.projectiles[this.id];
    }

  }
  this.normalize();
};


/********
 * Game *
 ********/

function Game() {
  this.tick = 0;
  this.freeId = 1;
  this.units = {};
  this.projectiles = {};
}
Game.prototype.genId = function () {
  return this.freeId++;
};

Game.prototype.copy = function () {
  var g = new Game();
  g.tick = this.tick;
  _.each(this.units, function (unit) {
    g.addUnit(unit.copy());
  });
  _.each(this.projectiles, function (projectile) {
    g.addProjectile(projectile.copy());
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
Game.prototype.addProjectile = function (projectile) {
  if (projectile.id) {
    this.projectiles[projectile.id] = projectile;
    projectile.game = this;
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


  var source_ids = _.keys(source.projectiles);
  var dest_ids = _.keys(dest.projectiles);

  var now_dead = _.difference(dest_ids, source_ids);
  _.each(now_dead, function (id) {
    diffs.push({
      dtype : "projectile",
      action : "remove",
      id : id
    });
  });

  _.each(_.shuffle(source.projectiles), function (s_projectile) {
    var d_projectile = dest.projectiles[s_projectile.id];
    if (d_projectile) {
      var u_diff = d_projectile.diff(s_projectile);
      if (u_diff.length > 0) {
        diffs.push({
          dtype : "projectile",
          action : "update",
          id : s_projectile.id,
          diff : u_diff
        });
      }
    } else {
      diffs.push({
        dtype : "projectile",
        action : "new",
        id : s_projectile.id,
        diff : (new Projectile()).diff(s_projectile)
      });
    }
  });

  return { tick : source.tick, freeId : source.freeId, diffs : diffs};
};
Game.prototype.updateFromDiff = function (diff) {
  var dest = this;
  this.tick = diff.tick;
  this.freeId = diff.freeId;
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
    } else if (d.dtype === "projectile") {
      if (d.action === "remove") {
        delete dest.projectiles[d.id];
      } else if (d.action === "new") {
        var p = new Projectile({id : d.id});
        dest.addProjectile(p);
        p.updateFromDiff(d.diff);
      } else if (d.action === "update") {        
        dest.projectiles[d.id].updateFromDiff(d.diff);
      }
    }
  });
};

Game.generateUpdateBuffer = function (buf, offset, maxBytes, diff) {
  var len = 0;
  buf.writeUInt32LE(diff.tick, offset+len); len += 4;
  buf.writeUInt16LE(diff.freeId, offset+len); len += 2;
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
    } else if (d.dtype === "projectile") {
      if (d.action === "remove") {
        if (maxBytes - (offset+len) >= 3) {
          buf.writeUInt8(11, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
        }
      } else if (d.action === "new") {
        if (maxBytes - (offset+len) >= 4) {
          buf.writeUInt8(12, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
          len += Projectile.generateUpdateBuffer(buf, offset+len, maxBytes, d.diff);
        }
      } else if (d.action === "update") {
        if (maxBytes - (offset+len) >= 4) {
          buf.writeUInt8(13, (offset+len)); len += 1;
          buf.writeUInt16LE(d.id, (offset+len)); len += 2;
          len += Projectile.generateUpdateBuffer(buf, (offset+len), maxBytes, d.diff);
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
  var freeId = buf.readUInt16LE(offset+len); len += 2;
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
    } else if (code === 11) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      diffs.push({ dtype : "projectile",
                   action : "remove",
                   id : id });
    } else if (code === 12) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      var p = Projectile.readUpdateBuffer(buf, offset+len);
      len += p.len;
      diffs.push({ dtype : "projectile",
                   action : "new",
                   id : id,
                   diff : p.diff });
    } else if (code === 13) {
      var id = buf.readUInt16LE(offset+len); len += 2;
      var p = Projectile.readUpdateBuffer(buf, offset+len);
      len += p.len;
      diffs.push({ dtype : "projectile",
                   action : "update",
                   id : id,
                   diff : p.diff }); 
    }
  }
  return { diff : { tick : tick, freeId : freeId, diffs : diffs }, len : len };
};
Game.prototype.step = function () {
  this.quadtree = new vect.Quadtree(null, 0, 0, 4096);
  this.quadtree.addAll(this.units);
  _.each(_.keys(this.units), function (unit_id) {
    this.units[unit_id].step();
  }, this);
  _.each(_.keys(this.projectiles), function (projectile_id) {
    this.projectiles[projectile_id].step();
  }, this);
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

function UnitFireAction(props) {
  _.extend(this, props);
  _.defaults(this, {
    uid : null    
  });
  normalize(this);
}
addActionType(UnitFireAction);
UnitFireAction.props = [
  { name : "uid", type : types.UInt16 }
];

UnitFireAction.prototype.perform = function (game) {
  var unit = game.units[this.uid];
  if (unit) {
    unit.fire();
  }
};


function UnitDestructAction(props) {
  _.extend(this, props);
  _.defaults(this, {
    uid : null
  });
  normalize(this);
}
addActionType(UnitDestructAction);
UnitDestructAction.props = [
  { name : "uid", type : types.UInt16 }
];

UnitDestructAction.prototype.perform = function (game) {
  delete game.units[this.uid];
};

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
exports.UnitFireAction = UnitFireAction;
exports.UnitDestructAction = UnitDestructAction;
