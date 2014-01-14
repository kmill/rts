var _ = require("underscore");

function Canvas(selector) {
  this.$canvas = $(selector);
  this.$canvas.on("contextmenu selectstart", function (ev) {
    ev.preventDefault();
  });
  this.resize();
  $(window).on('resize', _.im(this, 'resize'));

  this.c = this.$canvas[0].getContext("2d");
}
Canvas.prototype.resize = function resize() {
  this.$canvas
    .attr('height', this.height = window.innerHeight)
    .attr('width', this.width = window.innerWidth);
};

var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;

function startAnimationLoop(canvas, drawFrame) {
  function loop() {
    requestAnimFrame(function (timestamp) {
      loop();
      drawFrame(canvas, timestamp);
    });
  }
  loop();
}

exports.Canvas = Canvas;
exports.startAnimationLoop = startAnimationLoop;
