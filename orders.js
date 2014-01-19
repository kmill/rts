// orders.js

var _ = require("underscore");

function MoveOrder(pt) {
  this.pt = pt;
}

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

exports.MoveOrder = MoveOrder;
exports.Orders = Orders;
