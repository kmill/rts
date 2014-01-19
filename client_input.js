var _ = require("underscore");
var jqmousewheel = require("./jquery.mousewheel");
jqmousewheel($);

var SHIFT = 16;
var CTRL = 17;
var ALT = 18;

function InputWatcher(mouseSelector) {
  var o = this;
  o.keys = {};
  o.buttons = {};
  o.x = null;
  o.y = null;
  o.path = null;

  o.mouseHandlers = [];
  o.mouseWheelHandlers = [];
  $(function () {
    $(document).keydown(function (e) {
      e.preventDefault();
      o.keys[e.which] = true;
    });
    $(document).keyup(function (e) {
      e.preventDefault();
      delete o.keys[e.which];
    });
    $(mouseSelector).mousemove(function (e) {
      o.x = e.pageX;
      o.y = e.pageY;
      if (o.path) {
        o.path.push({x : o.x, y : o.y});
      }
    });
    $(mouseSelector).mousedown(function (e) {
      e.preventDefault();
      o.x = e.pageX;
      o.y = e.pageY;
      if (o.buttons[e.which] === void 0) {
        o.buttons[e.which] = {
          x : o.x,
          y : o.y
        };
      } else {
        // do nothing; this is due to going off the window
      }
      o.path = [{x : o.x, y : o.y}];
    });
    $(mouseSelector).mouseup(function (e) {
      o.x = e.pageX;
      o.y = e.pageY;
      var released = o.buttons[e.which];
      var path = o.path;
      delete o.buttons[e.which];
      o.path = null;
      _.each(o.mouseHandlers, function (l) {
        l(o, e.which, released, path);
      });
    });
    $(mouseSelector).mousewheel(function (e) {
      e.preventDefault();
      _.each(o.mouseWheelHandlers, function (l) {
        l(o, e.deltaX, e.deltaY);
      });
    });
  });
}
InputWatcher.prototype.listenMouse = function (l) {
  this.mouseHandlers.push(l);
};
InputWatcher.prototype.listenMouseWheel = function (l) {
  this.mouseWheelHandlers.push(l);
};
InputWatcher.prototype.reset = function () {
  this.keys = {};
  this.buttons = {};
};
InputWatcher.prototype.shift = function () {
  return _.has(this.keys, SHIFT);
};
InputWatcher.prototype.ctrl = function () {
  return _.has(this.keys, CTRL);
};
InputWatcher.prototype.alt = function () {
  return _.has(this.keys, ALT);
};

exports.InputWatcher = InputWatcher;
