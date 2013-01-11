/*global describe:false it:false beforeEach:false afterEach:false */
"use strict";

var assert = require('assert');
var sinon = require('sinon');

try {
    var Schema = require('../lib-cov/schema').Schema;
} catch(e) {
    var Schema = require('../lib/schema').Schema;
}

sinon.assert.expose(global);

describe('Schema', function() {
  var s;
  beforeEach(function() {
    s = new Schema();
  });

  describe('load', function() {
    it('loads a schema', function() {
      assert(s.load('string'));
    });
  });
});
