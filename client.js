var _ = require('underscore');
var graphics = require('./graphics');
var client_networking = require('./client_networking');
var client_input = require('./client_input.js');
var buffer = require('buffer');

_.mixin({
  // Creates a new object from a prototype, extending the new object
  // with the optional 'props' argument.
  create : function (o, props) {
    if (o === undefined) {
      throw new TypeError("Cannot extend undefined.");
    }
    function F() { _.extend(this, props); }
    F.prototype = o;
    return new F();
  },
  // Gets an instance method of an object
  im : function (o, fname) {
    var f = o[fname];
    if (f === undefined) {
      throw new TypeError("No such method '" + fname + "' when creating instance method.");
    }
    var args = _.rest(arguments, 2);
    return function () {
      return f.apply(o, args.concat(_.toArray(arguments)));
    };
  }
});

var model = require('./model');
var cmodel = new model.ClientModel();
window.cmodel = cmodel;
var game = cmodel.game;
var client_model = require('./client_model');
var cgame = new client_model.CGame(cmodel.game);
window.cgame = cgame;

$(function () {
  var canvas = new graphics.Canvas("#canvas");
  window.canvas = canvas;

  graphics.startAnimationLoop(canvas, animateFrame);
});

var response_buf = new Buffer(1024);

client_networking.register(function (socket, buf) {
  var networking = require('./networking');
  cmodel.readUpdateBuffer(buf);
  var len = 0;
  response_buf.writeUInt32LE(cmodel.game.tick, len); len += 4;
  var dir = 0;
  if (inputWatcher.keys[37]) {
    dir += 1;
  }
  if (inputWatcher.keys[38]) {
    dir += 2;
  }
  if (inputWatcher.keys[39]) {
    dir += 4;
  }
  if (inputWatcher.keys[40]) {
    dir += 8;
  }
  if (inputWatcher.ctrl()) {
    dir += 16;
  }
  response_buf.writeUInt8(dir, len);
  len += 1;
  var ids = _.keys(selected_ids);
  response_buf.writeUInt16LE(ids.length, len);
  len += 2;
  for (var i = 0; i < ids.length; i++) {
    response_buf.writeUInt16LE(+ids[i], len);
    len += 2;
  }
  socket.send(networking.bufferToString(response_buf, 0, len));
});

var inputWatcher = new client_input.InputWatcher("#canvas");

var selected_ids = {};

function dist(pt1, pt2) {
  return Math.sqrt((pt1.x-pt2.x)*(pt1.x-pt2.x) +
                   (pt1.y-pt2.y)*(pt1.y-pt2.y));
}

inputWatcher.listenMouse(function (input, which, released) {
  if (which === 1) {
    if (released.x === input.x
        && released.y === input.y) {
      var closest = null;
      _.each(game.units, function (unit) {
        if (dist(unit, input) < 10) {
          closest = unit;
        }
      });
      if (closest === null) {
        selected_ids = {};
      } else {
        if (input.shift()) {
          if (_.has(selected_ids, closest.id)) {
            delete selected_ids[closest.id];
          } else {
            selected_ids[closest.id] = true;
          }
        } else {
          selected_ids = {};
          selected_ids[closest.id] = true;
        }
      }
    } else {
      var sels = determine_prelim_selection(determine_rect(input, released));
      if (input.shift()) {
        _.extend(selected_ids, sels);
      } else {
        selected_ids = sels;
      }
    }
  } else if (which === 3) {
    console.log("move");
  } else {
    console.log("released " + which);
  }
});

var stats = new Stats();
stats.setMode(0);
stats.domElement.style.position = 'absolute';
stats.domElement.style.right = '0px';
stats.domElement.style.top = '0px';
$(function () { document.body.appendChild(stats.domElement); });
window.stats = stats;

var lastTimestamp = null;

// If the interframe time exceeds this, we assume the game was in the background
var INPUT_RESET_TIMEOUT = 700;
window.game = game;

function determine_rect(pt1, pt2) {
  return {
    x : Math.min(pt1.x, pt2.x),
    y : Math.min(pt1.y, pt2.y),
    width : Math.abs(pt1.x - pt2.x),
    height : Math.abs(pt1.y - pt2.y)
  };
}

function determine_selection_rect() {
  if (_.has(inputWatcher.buttons, 1)) {
    return determine_rect({x : inputWatcher.x,
                           y : inputWatcher.y},
                          {x : inputWatcher.buttons[1].x,
                           y : inputWatcher.buttons[1].y});
  } else {
    return null;
  }
}

function between(x, a, b) {
  return a <= x && x <= b;
}
function within(pt, rect) {
  return (between(pt.x, rect.x, rect.x + rect.width)
          && between(pt.y, rect.y, rect.y + rect.height));
}

function determine_prelim_selection(/*opt*/bounds) {
  if (bounds === undefined) {
    bounds = determine_selection_rect();
  }
  var selected = {};
  if (bounds !== null) {
    _.each(cgame.units, function (unit) {
      if (within(unit, bounds)) {
        selected[unit.id] = true;
      }
    });
  }
  return selected;
}

function animateFrame(canvas, timestamp) {
  stats.begin();

  if (lastTimestamp !== null) {
    if (timestamp - lastTimestamp > INPUT_RESET_TIMEOUT) {
      inputWatcher.reset();
    }
  }
  lastTimestamp = timestamp;

  cgame.update(timestamp);

  var sels = determine_prelim_selection();
  _.extend(sels, selected_ids);

  canvas.c.beginPath();
  canvas.c.strokeWidth = 1;
  canvas.c.strokeStyle = "#000";
  canvas.c.clearRect(0, 0, canvas.width, canvas.height);
  canvas.c.stroke();

  _.each(cgame.units, function (unit) {
    canvas.c.save();
    canvas.c.translate(unit.x, unit.y);
    canvas.c.fillText(unit.x.toFixed(2) + "," + unit.y.toFixed(2), 10, 15);
    canvas.c.rotate(-unit.heading);

    canvas.c.beginPath();
    canvas.c.moveTo(10, 0);
    canvas.c.lineTo(-5, -5);
    canvas.c.lineTo(-5, 5);
    canvas.c.lineTo(10, 0);
    canvas.c.stroke();
    canvas.c.beginPath();
    if (_.has(sels, unit.id)) {
      canvas.c.strokeStyle = "#0c0";
      canvas.c.rect(-7, -7, 19, 13);
      canvas.c.stroke();
    }
    canvas.c.restore();
  });

  canvas.c.beginPath();
  canvas.c.font = "10px sans-serif";
  canvas.c.fillText("" + game.tick  + "[" + cmodel.latency + "] " + (client_networking.isConnected() ? "(connected)" : "(not connected)"), 10, 25);
  canvas.c.fillText("Keys: " + _.keys(inputWatcher.keys), 10, 40);
  canvas.c.fillText("Selected: " + _.keys(sels), 10, 55);
  canvas.c.stroke();

  if (_.has(inputWatcher.buttons, 1)
     && !(inputWatcher.buttons[1].x === inputWatcher.x
          && inputWatcher.buttons[1].y === inputWatcher.y)) {
    var endx = inputWatcher.x, endy = inputWatcher.y;
    var startx = inputWatcher.buttons[1].x,
        starty = inputWatcher.buttons[1].y;
    canvas.c.beginPath();
    canvas.c.strokeStyle = "#0a0";
    canvas.c.rect(Math.min(startx, endx) + 0.5-1,
                  Math.min(starty, endy) + 0.5-1,
                  Math.abs(startx - endx)+2,
                  Math.abs(starty - endy)+2);
    canvas.c.stroke();
    canvas.c.beginPath();
    canvas.c.strokeStyle = "#0f0";
    canvas.c.rect(Math.min(startx, endx) + 0.5,
                  Math.min(starty, endy) + 0.5,
                  Math.abs(startx - endx),
                  Math.abs(starty - endy));
    canvas.c.stroke();
  }
  if (inputWatcher.path) {
    canvas.c.beginPath();
    canvas.c.strokeStyle = "#00a";
    var started = false;
    _.each(inputWatcher.path, function (p) {
      if (started) {
        canvas.c.lineTo(p.x, p.y);
      } else {
        canvas.c.moveTo(p.x, p.y);
        started = true;
      }
    });
    canvas.c.stroke();
  }

  stats.end();
}