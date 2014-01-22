// This is a wrapper over the game model so the client can control
// its own objects

var _ = require('underscore');
var model = require('./model');
var constants = require("./constants");
var vect = require("./vect");

var DELAY = 100;


function quadratic(t, t1, y1, t2, y2, t3, y3) {
  var v = (t - t2) * (t - t3) * y1 / ((t1 - t2) * (t1 - t3));
  v += (t - t1) * (t - t3) * y2 / ((t2 - t1) * (t2 - t3));
  v += (t - t1) * (t - t2) * y3 / ((t3 - t1) * (t3 - t2));
  return v;
}
function linear (t, t2, y2, t3, y3) {
  return (t - t3) * y2/(t2-t3) + (t - t2) * y3/(t3-t2);
};

function CUnit(unit, cgame) {
  this.unit = unit;
  this.cgame = cgame;
  this.id = unit.id;
  this.x = unit.x;
  this.y = unit.y;
  this.heading = unit.heading;
  this.posHistory = [];
}
CUnit.prototype.updatePosHistory = function () {
  if (this.posHistory.length < 5 || this.posHistory[0].tick < this.cgame.game.tick) {
    this.posHistory.splice(0, 0, {
      tick : this.cgame.game.tick,
      timestamp : this.cgame.tickTimestamp,
      x : this.unit.x,
      y : this.unit.y,
      heading : this.unit.heading
    });
    if (this.posHistory.length > 5) {
      this.posHistory.pop();
    }
  } 
};
CUnit.prototype.update = function (timestamp) {
  this.updatePosHistory();
  var dt = (timestamp - this.cgame.tickTimestamp) / constants.TICK_INTERVAL;
  if (true && this.posHistory.length >= 3) {
    var p = this.posHistory;
    var i = 0;
    var delayed = timestamp - DELAY;
    while (i + 1 < p.length && p[i+1].timestamp > timestamp - DELAY) {
      i++;
    }
    var j = i + 1 < p.length ? i + 1 : i;
    if (p[i].timestamp < delayed - 1000) {
      delayed = p[i].timestamp + 1000;
    }
    this.x = linear(delayed,
                   p[j].timestamp, p[j].x,
                   p[i].timestamp, p[i].x);
    this.y = linear(delayed,
                   p[j].timestamp, p[j].y,
                   p[i].timestamp, p[i].y);

    this.heading = linear(delayed,
                          p[j].timestamp, p[j].heading % (2*Math.PI),
                          p[i].timestamp, vect.angleCut(p[i].heading,
                                                       p[j].heading % (2*Math.PI) - Math.PI));
  } else if (false) {
    this.x = this.unit.x + dt*this.unit.dx;
    this.y = this.unit.y + dt*this.unit.dy;
    this.heading = this.unit.heading + dt*this.unit.rotationSpeed;
  } else {
    this.x = this.unit.x;
    this.y = this.unit.y;
    this.heading = this.unit.heading;
  }

};

function CProjectile(projectile, cgame) {
  this.projectile = projectile;
  this.cgame = cgame;
  this.id = projectile.id;
  this.x = projectile.x;
  this.y = projectile.y;
  this.destroyed = false;
  this.posHistory = [];
}
CProjectile.prototype.updatePosHistory = function () {
  if (this.posHistory.length < 5 || this.posHistory[0].tick < this.cgame.game.tick) {
    this.posHistory.splice(0, 0, {
      tick : this.cgame.game.tick,
      timestamp : this.cgame.tickTimestamp,
      destroyed : this.destroyed,
      x : this.projectile.x,
      y : this.projectile.y
    });
    if (this.posHistory.length > 5) {
      this.posHistory.pop();
    }
  } 
};
CProjectile.prototype.update = function (timestamp) {
  this.updatePosHistory();
  var p = this.posHistory;
  var i = 0;
  var delayed = timestamp - DELAY;
  while (i + 1 < p.length && p[i+1].timestamp > timestamp - DELAY) {
    i++;
  }
  var j = i + 1 < p.length ? i + 1 : i;
  if (p[i].timestamp < delayed - 1000) {
    delayed = p[i].timestamp + 1000;
  }
  if (p[j].destroyed) {
    this.cgame.removeProjectile(this);
    return;
  }
  this.x = linear(delayed,
                  p[j].timestamp, p[j].x,
                  p[i].timestamp, p[i].x);
  this.y = linear(delayed,
                  p[j].timestamp, p[j].y,
                  p[i].timestamp, p[i].y);
  return;
  var dt = (timestamp - this.cgame.tickTimestamp) / constants.TICK_INTERVAL;
  this.x = this.projectile.x + dt*this.projectile.dx;
  this.y = this.projectile.y + dt*this.projectile.dy;
}


function CGame(cmodel) {
  this.cmodel = cmodel;
  this.pgame = this.cmodel.predictGame();
  this.game = this.cmodel.game;
  this.tick = this.cmodel.game.tick;
  this.units = {};
  this.projectiles = {};
  this.update(null);
}
CGame.prototype.update = function (timestamp) {
  if (this.tick != this.game.tick) {
    this.tickTimestamp = timestamp;
    this.tick = this.game.tick;
    this.pgame = this.cmodel.predictGame();
  }
  _.each(this.game.units, function (unit) {
    if (!_.has(this.units, unit.id)) {
      this.units[unit.id] = new CUnit(unit, this);
    } else {
      this.units[unit.id].unit = unit;
    }
  }, this);
  _.each(_.keys(this.units), function (uid) {
    var cunit = this.units[uid];
    if (_.has(this.game.units, cunit.id)) {
      cunit.update(timestamp);
    } else {
      delete this.units[uid];
    }
  }, this);

  _.each(this.game.projectiles, function (projectile) {
    if (!_.has(this.projectiles, projectile.id)) {
      this.projectiles[projectile.id] = new CProjectile(projectile, this);
    } else {
      this.projectiles[projectile.id].projectile = projectile;
    }
  }, this);
  _.each(_.keys(this.projectiles), function (pid) {
    var cproj = this.projectiles[pid];
    if (_.has(this.game.projectiles, pid)) {
      cproj.update(timestamp);
    } else {
      cproj.destroyed = true;
      cproj.update(timestamp);
    }
  }, this);
};
CGame.prototype.removeProjectile = function (cproj) {
  delete this.projectiles[cproj.id];
};

exports.CGame = CGame;
