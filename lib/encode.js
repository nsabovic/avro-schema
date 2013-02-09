"use strict";

var Encoder = module.exports.Encoder = function Encoder() {
  this.buf = new Buffer(1024);
  this.pos = 0;
};

Encoder.prototype.ensure = function(length) {
  if (this.pos + length > this.buf.length) {
    var newBuf = new Buffer(this.buf.length << 1);
    this.buf.copy(newBuf);
    this.buf = newBuf;
  }
};

Encoder.prototype.length = function() {
  return this.buf.length;
};

// data can be whatever.
Encoder.prototype.writeBool = function(data) {
  this.ensure(1);
  this.buf.writeUInt8(data ? 1 : 0, this.pos++);
};

// This I have tested.
// data must be Number, will be converted to 32bit integer.
Encoder.prototype.writeInt = function(data) {
  this.ensure(10);
  var x = data < 0 ? ((-data) - 1 << 1) + 1 : data << 1;
  do {
    this.buf.writeUint8LE(x & 0x7f, this.pos++);
    x >>= 7;
  } while (x);
};

// data must be Number.
Encoder.prototype.writeFloat = function(data) {
  this.ensure(4);
  this.buf.writeFloatLE(data, this.pos);
  this.pos += 4;
};

// data must be Number.
Encoder.prototype.writeDouble = function(data) {
  this.ensure(8);
  this.buf.writeDoubleLE(data, this.pos);
  this.pos += 8;
};

// data must be String.
Encoder.prototype.writeString = function(data) {
  this.ensure(Buffer.byteLength(data));
  this.buf.write(data, this.pos);
  this.pos += this.buf._charsWritten;
};

// data must be Buffer.
Encoder.prototype.writeBytes = function(data) {
  this.ensure(data.length);
  data.copy(this.buf, this.pos);
  this.pos += data.length;
};

Encoder.prototype.result = function result() {
  return this.buf.slice(0, this.pos);
};
