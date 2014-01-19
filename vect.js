var _ = require("underscore");

function dist(pt1, pt2) {
  return Math.sqrt((pt1.x-pt2.x)*(pt1.x-pt2.x) +
                   (pt1.y-pt2.y)*(pt1.y-pt2.y));
}

function unit(pt0, pt) {
  var dpt = {x : pt.x - pt0.x, y : pt.y - pt0.y};
  var d = Math.sqrt(dpt.x * dpt.x + dpt.y * dpt.y);
  dpt.x /= d;
  dpt.y /= d;
  return dpt;
}

function interp(a, b, alpha) {
  if (a === b) {
    return a;
  } else {
    return alpha * (b - a) + a;
  }
}

function interp2(pt1, pt2, alpha) {
  return {
    x : interp(pt1.x, pt2.x, alpha),
    y : interp(pt1.y, pt2.y, alpha)
  };
}

function atan(pt0, pt) {
  return Math.atan2(pt.y - pt0.y, pt.x - pt0.x);
}

function angleCut(theta, minAngle) {
  theta = (2 * Math.PI + theta - minAngle) % (2 * Math.PI) + minAngle;
  return theta;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function between(x, a, b) {
  return a <= x && x <= b;
}
function within(pt, rect) {
  return (between(pt.x, rect.x, rect.x + rect.width)
          && between(pt.y, rect.y, rect.y + rect.height));
}

function Quadtree(parent, x, y, width) {
  this.parent = parent;
  this.x = x;
  this.y = y;
  this.width = width;
  this.points = [];
  this.subtree = null;
}
Quadtree.prototype.add = function (pt) {
  if (this.subtree !== null) {
    var i = Math.floor(2 * (pt.x - this.x) / this.width);
    var j = Math.floor(2 * (pt.y - this.y) / this.width);
    try {
      this.subtree[2*i + j].add(pt);
    } catch (x) {
      console.log([i, j]);
      throw x;
    }
  } else {
    this.points.push(pt);
    pt.quadtree = this;
    if (this.points.length > 5) {
      this.subdivide();
    }
  }
};
Quadtree.prototype.addAll = function (pts) {
  _.each(pts, function (pt) {
    this.add(pt);
  }, this);
};
Quadtree.prototype.subdivide = function () {
  this.subtree = [
    new Quadtree(this, this.x, this.y, this.width/2),
    new Quadtree(this, this.x, this.y+this.width/2, this.width/2),
    new Quadtree(this, this.x+this.width/2, this.y, this.width/2),
    new Quadtree(this, this.x+this.width/2, this.y+this.width/2, this.width/2)
  ];
  var points = this.points;
  this.points = null;
  _.each(points, function (pt) {
    this.add(pt);
  }, this);
};
Quadtree.prototype.lookup = function (pt, radius) {
  //console.log([this.x, this.y, this.width]);
  var found;
  if (this.subtree !== null) {
    found = [];
    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 2; j++) {
        if (pt.x - radius <= this.x + (i+1)*this.width/2
            && pt.x + radius >= this.x + i*this.width/2
            && pt.y - radius <= this.y + (j+1)*this.width/2
            && pt.y + radius >= this.y + j*this.width/2) {
          found = found.concat(this.subtree[2*i+j].lookup(pt, radius));
        }
      }
    }
  } else {
    found = _.filter(this.points, function (myPt) {
      return dist(myPt, pt) <= radius;
    });
  }
  return found;
};

exports.dist = dist;
exports.unit = unit;
exports.atan = atan;
exports.angleCut = angleCut;
exports.clamp = clamp;
exports.interp = interp;
exports.interp2 = interp2;
exports.between = between;
exports.within = within;
exports.Quadtree = Quadtree;