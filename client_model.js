// This is a wrapper over the game model so the client can control
// its own objects

var _ = require('underscore');
var model = require('./model');
var constants = require("./constants");


function quadratic(t, t1, y1, t2, y2, t3, y3) {
  var v = (t - t2) * (t - t3) * y1 / ((t1 - t2) * (t1 - t3));
  v += (t - t1) * (t - t3) * y2 / ((t2 - t1) * (t2 - t3));
  v += (t - t1) * (t - t2) * y3 / ((t3 - t1) * (t3 - t2));
  return v;
}
quadratic = function linear (t, t1, y1, t2, y2, t3, y3) {
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
  if (this.posHistory.length < 3 || this.posHistory[2].tick < this.cgame.pgame.tick) {
    this.posHistory.push({
      tick : this.cgame.pgame.tick,
      timestamp : this.cgame.tickTimestamp,
      x : this.unit.x,
      y : this.unit.y
    });
    if (this.posHistory.length > 3) {
      this.posHistory.splice(0, 1);
    }
  } 
};
CUnit.prototype.update = function (timestamp) {
  this.updatePosHistory();
  var dt = (timestamp - this.cgame.tickTimestamp) / constants.TICK_INTERVAL;
  if (true && this.posHistory.length == 3) {
    var p = this.posHistory;
    this.x = quadratic(timestamp,
                   p[0].timestamp, p[0].x,
                   p[1].timestamp, p[1].x,
                   p[2].timestamp, p[2].x);
    this.y = quadratic(timestamp,
                   p[0].timestamp, p[0].y,
                   p[1].timestamp, p[1].y,
                   p[2].timestamp, p[2].y);
    this.heading = this.unit.heading + dt*this.unit.rotationSpeed;
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

function CGame(cmodel) {
  this.cmodel = cmodel;
  this.pgame = this.cmodel.predictGame();
  this.game = this.cmodel.game;
  this.tick = this.cmodel.game.tick;
  this.units = {};
  this.update(null);
}
CGame.prototype.update = function (timestamp) {
  var that = this;
  if (this.tick != this.game.tick) {
    this.tickTimestamp = timestamp;
    this.tick = this.game.tick;
    this.pgame = this.cmodel.predictGame();
  }
  var wanted_ids = {};
  _.each(that.game.units, function (unit) {
    wanted_ids[unit.id] = true;
    if (!_.has(that.units, unit.id)) {
      that.units[unit.id] = new CUnit(unit, that);
    } else {
      that.units[unit.id].unit = unit;
    }
  });
  var to_delete = [];
  _.each(that.units, function (cunit) {
    if (_.has(wanted_ids, cunit.id)) {
      cunit.update(timestamp);
    } else {
      to_delete.push(cunit.id);
    }
  });
  _.each(to_delete, function (id) { delete that.units[id]; });
};

exports.CGame = CGame;
