var _ = require("underscore");

var SHIFT = 16;
var CTRL = 17;
var ALT = 18;

function InputWatcher(mouseSelector) {
  var o = this;
  o.keys = {};
  o.buttons = {};
  o.x = null;
  o.y = null;

  o.mouseHandlers = [];
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
    });
    $(mouseSelector).mousedown(function (e) {
      e.preventDefault();
      o.x = e.pageX;
      o.y = e.pageY;
      o.buttons[e.which] = {
        x : o.x,
        y : o.y
      };
    });
    $(mouseSelector).mouseup(function (e) {
      o.x = e.pageX;
      o.y = e.pageY;
      var released = o.buttons[e.which];
      delete o.buttons[e.which];
      _.each(o.mouseHandlers, function (l) {
        l(o, e.which, released);
      });
    });
    $(mouseSelector).on('mousewheel', function (e) {
      e.preventDefault();
      debugger;
      console.log(e);
    });
  });
}
InputWatcher.prototype.listenMouse = function (l) {
  this.mouseHandlers.push(l);
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
