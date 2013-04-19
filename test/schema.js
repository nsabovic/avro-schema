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
  var s = null;

  function loader(schemaObj) {
    return function() {
      s.load(schemaObj);
    };
  }

  beforeEach(function() {
    s = new Schema();
  });

  describe('load', function() {
    it('loads a simple string schema', function() {
      assert(s.load('string'));
    });
    it('loads a simple record schema', function() {
      var schema = {
        "type" : "record",
        "name" : "a",
        "fields" : [ {
          "name" : "b",
          "type" : "int"
        } ]
      };
      assert(s.load(schema));
    });
    it('loads a simple array schema', function() {
      var schema = {
        "type"  : "array",
        "name"  : "a",
        "items" : "int"
      };
      assert(s.load(schema));
    });
    it('loads a simple map schema', function() {
      var schema = {
        "type" : "map",
        "name" : "a",
        "keys" : "string",
        "values": "boolean"
      };
      assert(s.load(schema));
    });
    it('prohibits longs in schema', function() {
      assert.throws(loader('long'), Error);
    });
    it('prohibits unrecognized symbols in schema', function() {
      assert.throws(loader('schlong'), Error);
    });
    it('prohibits unnames records in schema', function() {
      var schema = {
        "type" : "record",
        "fields" : [ {
          "name" : "b",
          "type" : "string"
        } ]
      };
      assert.throws(loader(schema), Error);
    });
    it('displays the path of failure in the error', function() {
      var schema = {
        "type" : "record",
        "name" : "a",
        "fields" : [ {
          "name" : "b",
          "type" : {
            "type"  : "map",
            "keys"  : "string",
            "values": ["string", "blah"]
          }
        } ]
      };
      assert.throws(loader(schema), /root\.b\.values\:1/);
    });
  });
});
