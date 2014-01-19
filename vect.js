function dist(pt1, pt2) {
  return Math.sqrt((pt1.x-pt2.x)*(pt1.x-pt2.x) +
                   (pt1.y-pt2.y)*(pt1.y-pt2.y));
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

exports.dist = dist;
exports.atan = atan;
exports.angleCut = angleCut;
exports.clamp = clamp;
exports.interp = interp;
exports.interp2 = interp2;
