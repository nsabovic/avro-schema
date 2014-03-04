"use strict";

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var util = require('util');

try {
    var Schema = require('../lib-cov/schema').Schema;
}
catch(e) {
    var Schema = require('../lib/schema').Schema;
}

var schema_path = __dirname + '/schemas/';

function loadFile(schema, schema_file) {
  return schema.load(JSON.parse(fs.readFileSync(schema_file)));
}

describe('Schema Validation', function() {
  describe('simple schema record', function() {
    var s = new Schema();
    loadFile(s, schema_path + 'simple.avsc');
    it('loads with some optional fields missing', function() {
      var o = {
        "req1": "bla",
        "opt1": "bla2",
        "opt2": false
      };
      assert(s.validate(o, 'com.namespace.Simple') === true);
    });
    it('loads with some fields with defaults missing', function() {
      var o = {
        "req1": "bla",
        "opt1": "bla2"
      };
      assert(s.validate(o, 'com.namespace.Simple') === true);
    });
    it('loads with addtional fields present', function() {
      var o = {
        "req1": "bla",
        "opt1": "bla2",
        "opt2": false,
        "field_not_present": "foo"
      };
      assert(s.validate(o, 'com.namespace.Simple') === true);
    });
    it('fails with some required fields missing', function() {
      var o = {
        "opt1": "bla2",
        "opt2": false
      };
      assert(s.validate(o, 'com.namespace.Simple') === false);
    });
    it('fails with type different for a field', function() {
      var o = {
        "req1": "bla",
        "opt1": "bla2",
        "opt2": false,
        "opt3": "bkla"
      };
      assert(s.validate(o, 'com.namespace.Simple') === false);
    });
  });
  describe('complex schema record', function() {
    var s = new Schema();
    loadFile(s, schema_path + 'simple.avsc');
    loadFile(s, schema_path + 'simple2.avsc');
    loadFile(s, schema_path + 'complex.avsc');
    it('loads with some optional fields missing', function() {
      var o = {
          "cmplx1": {
          "req1": "bla",
          "opt2": true
        }
      };
      assert(s.validate(o, 'com.namespace.Complex') === true);
    });
    it('loads with additonal fields present', function() {
      var o = {
        "cmplx1": {
          "req1": "bla",
          "opt1": "bla2",
          "opt2": false
        },
        "field_not_present": "foo"
      };
      assert(s.validate(o, 'com.namespace.Complex') === true);
    });
    it('fails with some required fields missing', function() {
      var o = {
        "optcmplx": {
          "s": true
        },
        "opt2": false
      };
      assert(s.validate(o, 'com.namespace.Complex') === false);
    });
    it('passes with composite type in a record other than record', function() {
      var o = {
        "cmplx1": {
        "req1": "bla"
      },
      "opt3": [
        { "s": true },
        { "s": true }
        ]
      };
      assert(s.validate(o, 'com.namespace.Complex') === false);
    });
    it('fails with type different for a field in nested record', function() {
      var o = {
        "cmplx1": {
          "req1": "bla",
          "opt1": "bla2",
          "opt2": 123
        },
        "optcmplx": {
          "s": true
        },
        "opt2": false
      };
      assert(s.validate(o, 'com.namespace.Simple') === false);
    });
    it('fails with type different for a field', function() {
      var o = {
        "cmplx1": {
          "req1": "bla",
          "opt1": "bla2",
          "opt2": false
        },
        "optcmplx": {
          "s": true
        },
        "opt2": 123
      };
      assert(s.validate(o, 'com.namespace.Simple') === false);
    });
  });
  describe('Record with one array', function() {
    var s = new Schema();
    loadFile(s, schema_path + 'recArray.avsc');
    it('loads', function() {
      var o = {
        "theone": ["s"]
      };
      assert(s.validate(o, 'com.namespace.WithArray') === true);
    });
  });
});
