var _ = require('underscore');
var graphics = require('./graphics');
var client_networking = require('./client_networking');
var client_input = require('./client_input.js');
var buffer = require('buffer');
var vect = require('./vect');

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
var cgame = new client_model.CGame(cmodel);
window.cgame = cgame;
var orders = require('./orders');
var myOrders = new orders.Orders;

var planner = new orders.Planner(myOrders, cmodel);

$(function () {
  var canvas = new graphics.Canvas("#canvas");
  window.canvas = canvas;

  graphics.startAnimationLoop(canvas, animateFrame);
});

var response_buf = new Buffer(4096);

client_networking.register(function (send, buf) {
  var networking = require('./networking');
  cmodel.readUpdateBuffer(buf);

  planner.update();

  var len = 0;
  response_buf.writeUInt32LE(cmodel.game.tick, len); len += 4;

  if (false) {
    _.each(_.keys(selected_ids), function (uid) {
      var rotSpeed = 0;
      var thrust = 0;
      
      if (inputWatcher.keys[37]) {
        rotSpeed = 0.2;
      }
      if (inputWatcher.keys[38]) {
        thrust = 5;
      }
      if (inputWatcher.keys[39]) {
        rotSpeed = -0.2;
      }
      if (inputWatcher.keys[40]) {
        thrust = -5;
      }
      cmodel.queueAction(new model.UnitRotationAction({
        uid : uid,
        rotationSpeed : rotSpeed
      }));
      cmodel.queueAction(new model.UnitThrustAction({
        uid : uid,
        thrust : thrust
      }));
    });
  }

  len += cmodel.writeActions(response_buf, len, 1000);

  send(response_buf, 0, len);
});

var try_reconnecting = false;
setInterval(function () {
  if (try_reconnecting) {
    try_reconnecting = false;
    if (!client_networking.isConnected()) {
      client_networking.reconnect();
    }
  }
}, 500);

var inputWatcher = new client_input.InputWatcher("#canvas");

var selected_ids = {};


inputWatcher.listenMouse(function (input, which, released, path) {
  if (which === 1) {
    if (released.x === input.x
        && released.y === input.y) {
      var closest = null;
      var point = viewport.fromViewport(input);
      _.each(game.units, function (unit) {
        if (vect.dist(unit, point) < 10) {
          closest = unit;
        }
      });
      if (closest === null) {
        if (!input.shift()) {
          selected_ids = {};
        }
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
      var ipoint = viewport.fromViewport(input);
      var rpoint = viewport.fromViewport(released);
      var sels = determine_prelim_selection(determine_rect(ipoint, rpoint));
      if (input.shift()) {
        _.extend(selected_ids, sels);
      } else {
        selected_ids = sels;
      }
    }
  } else if (which === 3) {
    if (path.length === 1) {
      var order = new orders.MoveOrder(viewport.fromViewport(input));
      var ids = _.keys(selected_ids);
      if (input.shift()) {
        myOrders.addMultiOrder(ids, order);
      } else {
        myOrders.setMultiOrder(ids, order);
      }
    } else {
      var vpath = _.map(path, function (pt) { return viewport.fromViewport(pt); });
      var ids = _.shuffle(_.keys(selected_ids));
      var pathLength = 0;
      var lengths = [];
      for (var i = 0; i < vpath.length-1; i++) {
        var l = vect.dist(vpath[i], vpath[i+1]);
        pathLength += l;
        lengths.push(l);
      }
      var delta = pathLength / ids.length;
      var j = 0;
      var alpha = 0;
      function updateToNextPoint() {
        var margLen = 0;
        while (margLen < delta) {
          var segLen = vect.dist(vpath[j], vpath[j+1]);
          var remLen = (1-alpha) * segLen;
          var usedLen = alpha * segLen;
          if (segLen > 0 && remLen + margLen >= delta) {
            alpha = (delta - margLen + usedLen) / segLen;
            margLen = delta;
          } else {
            alpha = 0;
            j += 1;
            margLen += remLen;
          }
        }
      }
      var dest_points = [];
      for (i = 0; i < ids.length; i++) {
        var lastj = j, lastalpha = alpha;
        if (i > 0) {
          updateToNextPoint();
          if (j === lastj && lastalpha === alpha) debugger;
        }
        dest_points.push(vect.interp2(vpath[j], vpath[j+1], alpha));
      }
      var used_pts = {};
      _.each(ids, function (uid) {
        var unit = game.units[uid];
        var closest = null, best_dist=Infinity;
        for (var i = 0; i < dest_points.length; i++) {
          var dpt = dest_points[i];
          if (!_.has(used_pts, i)) {
            var dist = vect.dist(dpt, unit) / unit.type.maxThrust;
            if (dist < best_dist) {
              best_dist = dist;
              closest = i;
            }
          }
        }
        var dpt = dest_points[closest];
        dest_points[closest] = true;
        var order = new orders.MoveOrder(dpt);
        if (input.shift()) {
          myOrders.addOrder(uid, order);
        } else {
          myOrders.setOrder(uid, order);
        }
      });
    }
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
    return determine_rect(viewport.fromViewport(inputWatcher),
                          viewport.fromViewport(inputWatcher.buttons[1]));
  } else {
    return null;
  }
}

function determine_prelim_selection(/*opt*/bounds) {
  if (bounds === undefined) {
    bounds = determine_selection_rect();
  }
  var selected = {};
  if (bounds !== null) {
    _.each(cgame.units, function (unit) {
      if (vect.within(unit, bounds)) {
        selected[unit.id] = true;
      }
    });
  }
  return selected;
}

function Viewport(canvas) {
  this.canvas = canvas;
  this.center = { x : 0, y : 0};
  this.zoom = 0;
  this.zoomBase = 1.5;
}
Viewport.prototype.update = function (input) {
  if (input.buttons[2]) {
    var zoomFactor = Math.pow(this.zoomBase, this.zoom);
    var dx = (input.x - input.buttons[2].x) / zoomFactor;
    var dy = (input.buttons[2].y - input.y) / zoomFactor;
    this.center.x += dx * 0.05;
    this.center.y += dy * 0.05;
  }
};
Viewport.prototype.inputListen = function (input) {
  var self = this;
  input.listenMouseWheel(function (input, deltaX, deltaY) {
    var oldmouse = self.fromViewport(input);
    self.zoom += deltaY - deltaX; // deltaX for shift-scroll
    if (self.zoom < -6) { self.zoom = -6; }
    if (self.zoom > 10) { self.zoom = 10; }
    var newmouse = self.fromViewport(input);
    self.center.x += oldmouse.x - newmouse.x;
    self.center.y += oldmouse.y - newmouse.y;
  });
};
Viewport.prototype.fromViewport = function (point) {
  var cx = point.x - this.canvas.width/2;
  var cy = this.canvas.height/2 - point.y;
  var zoomFactor = Math.pow(this.zoomBase, this.zoom);
  return {
    x : this.center.x + cx/zoomFactor,
    y : this.center.y + cy/zoomFactor
  };
};
Viewport.prototype.toViewport = function (point) {
  var zoomFactor = Math.pow(this.zoomBase, this.zoom);
  return {
    x : zoomFactor * (point.x - this.center.x) + this.canvas.width/2,
    y : zoomFactor * (this.center.y - point.y) + this.canvas.height/2
  };
};
Viewport.prototype.addTransform = function (canvas) {
  var zoomFactor = Math.pow(this.zoomBase, this.zoom);
  canvas.c.transform(
    zoomFactor, 0,
    0, -zoomFactor,
    this.canvas.width/2 - zoomFactor * this.center.x,
    this.canvas.height/2 + zoomFactor * this.center.y
  );
};
Viewport.prototype.removeScaling = function (canvas) {
  var zoomFactor = Math.pow(this.zoomBase, this.zoom);
  canvas.c.scale(1/zoomFactor, 1/zoomFactor);
};

var viewport;

function animateFrame(canvas, timestamp) {
  stats.begin();

  if (viewport === void 0) {
    viewport = new Viewport(canvas);
    viewport.inputListen(inputWatcher);
  }
  viewport.update(inputWatcher);

  

  if (inputWatcher.keys[36]) { // HOME
    try_reconnecting = true;
  }

  if (lastTimestamp !== null) {
    if (timestamp - lastTimestamp > INPUT_RESET_TIMEOUT) {
      inputWatcher.reset();
    }
  }
  lastTimestamp = timestamp;

  cgame.update(timestamp);

  var sels = determine_prelim_selection();
  _.extend(sels, selected_ids);

  canvas.c.save();

  canvas.c.beginPath();
  canvas.c.strokeWidth = 1;
  canvas.c.strokeStyle = "#000";
  canvas.c.lineCap = 'round';
  canvas.c.clearRect(0, 0, canvas.width, canvas.height);
  canvas.c.stroke();

  canvas.c.save();
  viewport.addTransform(canvas);
  canvas.c.beginPath();
  canvas.c.strokeStyle = "#999";
  canvas.c.lineWidth = 5;
  canvas.c.moveTo(0, 0);
  canvas.c.lineTo(0, 4096);
  canvas.c.lineTo(4096, 4096);
  canvas.c.lineTo(4096, 0);
  canvas.c.lineTo(0, 0);
  canvas.c.stroke();
  canvas.c.beginPath();
  canvas.c.strokeStyle = "#000";
  canvas.c.moveTo(-20, 0);
  canvas.c.lineTo(20, 0);
  canvas.c.moveTo(0, -20);
  canvas.c.lineTo(0, 20);
  canvas.c.stroke();
  canvas.c.restore();

  _.each(cgame.units, function (cunit) {
    var unit = cunit.unit;
    if (unit.type === null) return;
    canvas.c.save();
    viewport.addTransform(canvas);
    canvas.c.translate(cunit.x, cunit.y);

    canvas.c.save();
    canvas.c.rotate(cunit.heading);
    if (_.has(sels, cunit.id)) {
      canvas.c.beginPath();
      canvas.c.strokeStyle = "#0c0";
      canvas.c.rect(unit.type.bounds[0].x - 2, unit.type.bounds[0].y - 2,
                    unit.type.bounds[1].x - unit.type.bounds[0].x + 4,
                    unit.type.bounds[1].y - unit.type.bounds[0].y + 4);
      canvas.c.stroke();
    }
    unit.type.draw(canvas);
    canvas.c.restore();

    canvas.c.transform(1, 0, 0, -1, 0, 0);
    canvas.c.beginPath();
    if (_.has(sels, cunit.id) && unit.x != null && unit.y != null) {
      canvas.c.fillText(unit.x.toFixed(2) + "," + unit.y.toFixed(2), 10, 15);
    }
    canvas.c.stroke();

    canvas.c.restore();
  });

  canvas.c.beginPath();
  canvas.c.font = "10px sans-serif";
  canvas.c.fillText("" + game.tick  + "[" + cmodel.latency + "] " + cgame.pgame.tick + " " + (client_networking.isConnected() ? "(connected)" : try_reconnecting ? "(attempting reconnection)" : "(not connected)"), 10, 25);
  canvas.c.fillText("Keys: " + _.keys(inputWatcher.keys), 10, 40);
  canvas.c.fillText("Selected: " + _.keys(sels), 10, 55);
  canvas.c.fillText("Center: " + viewport.center.x.toFixed(2) + ", " + viewport.center.y.toFixed(2) + " (" + viewport.zoom + ")", 10, 70);
  canvas.c.stroke();

  if (inputWatcher.shift()) {
    canvas.c.save();
    var visited = {};
    _.each(myOrders.orders, function (orders, uid) {
      var selected = _.has(selected_ids, uid);
      canvas.c.beginPath();
      canvas.c.strokeStyle = "#3f3";
      canvas.c.lineWidth = 2;
      if (selected) {
        canvas.c.globalAlpha = 1.0;
      } else {
        canvas.c.globalAlpha = 0.3;
      }
      var displace = 1 - (timestamp/1000) % 1;
      var pta = viewport.toViewport(cgame.units[uid]);
      _.each(orders, function (order) {
        var ptaString = pta.x + "," + pta.y;
        var ptb = viewport.toViewport(order.pt);
        //canvas.c.moveTo(pta.x, pta.y);
        //canvas.c.lineTo(ptb.x, ptb.y);

        if (!_.has(visited, ptaString) || (selected > visited[ptaString])) {
          visited[ptaString] = selected;
          
          var length = vect.dist(pta, ptb);
          var dx = (ptb.x - pta.x) * 20 / length;
          var dy = (ptb.y - pta.y) * 20 / length;
          for (var i = 0; i < length / 20 + 1; i++) {
            var nexti = i+0.5-displace;
            if (nexti >= length/20) {
              nexti = length/20;
            }
            var thisi = Math.max(0, i-displace);
            if (nexti <= 0 || thisi > length/20) continue;
            canvas.c.moveTo(pta.x + dx*thisi, pta.y + dy*thisi);
            canvas.c.lineTo(pta.x + dx*nexti, pta.y + dy*nexti);
          }
        }
        displace = (displace + length/20 - (~~(length/20))) % 1;
        pta = ptb;
      });
      canvas.c.stroke();
    });
    canvas.c.restore();
  }

  if (_.has(inputWatcher.buttons, 1)) {
    if (!(inputWatcher.buttons[1].x === inputWatcher.x
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
  } else if (_.has(inputWatcher.buttons, 2)) {
    canvas.c.save();
    canvas.c.lineWidth = 10;
    canvas.c.strokeStyle = "#00f";
    canvas.c.globalAlpha = 0.5;
    canvas.c.beginPath();
    canvas.c.moveTo(inputWatcher.buttons[2].x, inputWatcher.buttons[2].y);
    canvas.c.lineTo(inputWatcher.x, inputWatcher.y);
    canvas.c.stroke();
    canvas.c.restore();
  } else if (inputWatcher.path) {
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

  canvas.c.restore();

  stats.end();
}