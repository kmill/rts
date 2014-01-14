function SimpleUnit(x, y, vx, vy) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
}
SimpleUnit.prototype.step = function (tick) {
  this.x += this.vx;
  this.y += this.vy;
};
SimpleUnit.prototype.serialize = function (buf, offest) {
  buf.writeUInt32LE(this.x, offest);
  buf.writeUInt32LE(this.y, offest+4);
  buf.writeUInt32LE(this.vx, offest+8);
  buf.writeUInt32LE(this.vy, offest+12);
  return 16;
};
SimpleUnit.prototype.deserialize = function (buf, offset) {
  this.x = buf.readUInt32LE(offset);
  this.y = buf.readUInt32LE(offset+4);
  this.vx = buf.readUInt32LE(offset+8);
  this.vy = buf.readUInt32LE(offset+12);
  return 16;
};

exports.SimpleUnit = SimpleUnit;