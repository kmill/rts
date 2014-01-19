// orders.js

var _ = require("underscore");

function MoveOrder(pt) {
  this.pt = pt;
}
MoveOrder.prototype.visit = function (visitor) {
  visitor.moveOrder(this);
};

function Orders() {
  this.orders = {};
}

Orders.prototype.setOrder = function (uid, order) {
  this.orders[uid] = [order];
};
Orders.prototype.addOrder = function (uid, order) {
  if (_.has(this.orders, uid)) {
    this.orders[uid].push(order);
  } else {
    this.setOrder(uid, order);
  }
};
Orders.prototype.setMultiOrder = function (uids, order) {
  var self = this;
  _.each(uids, function (uid) { self.setOrder(uid, order); });
};
Orders.prototype.addMultiOrder = function (uids, order) {
  var self = this;
  _.each(uids, function (uid) { self.addOrder(uid, order); });
};
Orders.prototype.clearOrders = function (uid) {
  delete this.orders[uid];
};
Orders.prototype.peekOrder = function (uid) {
  if (_.has(this.orders, uid)) {
    if (this.orders[uid].length > 0) {
      return this.orders[uid][0];
    } else {
      this.clearOrders(uid);
    }
  }
  return null;
};
Orders.prototype.dequeueOrder = function (uid) {
  if (_.has(this.orders, uid)) {
    var spliced = this.orders[uid].splice(0, 1);
    if (spliced.length > 0) {
      return spliced[0];
    } else {
      this.clearOrders(uid);
    }
  }
  return null;
};

// planner
var vect = require('./vect');
var model = require('./model');

function Planner(orders, cmodel) {
  this.orders = orders;
  this.cmodel = cmodel;
}
Planner.prototype.update = function () {
  var self = this;

  var game = self.cmodel.game;
  var pgame = self.cmodel.predictGame();

  _.each(game.units, function (unit, uid) {
    var punit = pgame.units[uid];
    if (punit === void 0) { return; }
    var keepGoing = true;
    while (keepGoing) {
      var order = self.orders.peekOrder(uid);
      if (order === null) {
        if (punit.rotationSpeed !== 0) {
          self.cmodel.queueAction(new model.UnitRotationAction({
            uid : uid,
            rotationSpeed : 0
          }));
        }
        if (punit.thrust !== 0) {
          self.cmodel.queueAction(new model.UnitThrustAction({
            uid : uid,
            thrust : 0
          }));
        }
        break;
      }
      order.visit({
        moveOrder : function (order) {
          if (vect.dist(order.pt, unit) < 8) {
            self.orders.dequeueOrder(uid);
          } else {
            keepGoing = false;

            var desiredHeading = vect.atan(punit, order.pt);
            var headingDelta = vect.angleCut(punit.heading - desiredHeading, -Math.PI);
            //console.log([desiredHeading, headingDelta]);
            if (Math.abs(headingDelta) > Math.PI/1000) {
              var rotSpeed = -headingDelta/3;
              rotSpeed = vect.clamp(rotSpeed,
                                    -punit.type.maxRotationSpeed, punit.type.maxRotationSpeed);
              if (rotSpeed !== punit.rotationSpeed) {
                self.cmodel.queueAction(new model.UnitRotationAction({
                  uid : uid,
                  rotationSpeed : rotSpeed
                }));
              }
            } else {
              if (punit.rotationSpeed != 0) {
                self.cmodel.queueAction(new model.UnitRotationAction({
                  uid : uid,
                  rotationSpeed : 0
                }));
              }
            }
            
            if (Math.abs(headingDelta) < Math.PI/10) {
              var dist = vect.dist(punit, order.pt);
              var thrust = dist / 10;
              thrust = vect.clamp(thrust,
                                  punit.type.minThrust,
                                  punit.type.maxThrust);
              if (thrust !== punit.thrust) {
                self.cmodel.queueAction(new model.UnitThrustAction({
                  uid : uid,
                  thrust : thrust
                }));
              }
            } else {
              if (punit.thrust != 0) {
                self.cmodel.queueAction(new model.UnitThrustAction({
                  uid : uid,
                  thrust : 0
                }));
              }
            }
          }
        }
      });
    }
  });
};

exports.MoveOrder = MoveOrder;
exports.Orders = Orders;

exports.Planner = Planner;
