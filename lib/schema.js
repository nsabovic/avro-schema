"use strict";

var Encoder = require('./encode').Encoder;

var Schema = module.exports.Schema = function Schema() {
  this._symbols = [];
  this._lastLoaded = null;
  this._shortUnions = false;
};

Schema.prototype._schemaData = function _schemaData(schemaName) {
  var schema = schemaName ? this._symbols[schemaName] : this._lastLoaded;
  if (!schema) {
    throw new Error('Invalid schema.');
  }
  return schema;
};

Schema.prototype.load = function load(data) {
  var symbols = this._symbols;

  function loadSchema(schema, namespace) {

    // Register the schema into the symbol table.
    function registerSchema() {
      function registerSymbol(name) {
        if (typeof name !== 'string') {
          return false;
        }
        if (name.indexOf('.') === -1) {
          // use local param as override to schema specified
          name = (namespace || schema.namespace) + '.' + name;
        }
        if (name in symbols) {
          return symbols[name] === schema;
        } else {
          symbols[name] = schema;
          return true;
        }
      }

      return registerSymbol(schema.name) &&
        (!Array.isArray(schema.aliases) ||
          schema.aliases.every(registerSymbol));
    }

    var typeName = schema;
    if (typeof schema !== 'string') {
      if (typeof schema === 'object') {
        if (Array.isArray(schema)) {
          // Union.
          return schema.every(function loadUnionMember(s) {
            return loadSchema(s, namespace);
          });
        }
        typeName = schema.type;
      } else {
        return false;
      }
    }

    switch (typeName) {
      case 'long':
        // JavaScript cannot represent a 64-bit integer.
        return false;
      case 'null':
      case 'boolean':
      case 'string':
      case 'bytes':
      case 'int':
      case 'float':
      case 'double':
        return true;
      case 'array':
        return loadSchema(schema.items, namespace);
      case 'map':
        return loadSchema(schema.keys, namespace) &&
               loadSchema(schema.values, namespace);
      case 'enum':
      case 'fixed':
        return registerSchema();
      case 'record':
        return registerSchema() &&
               schema.fields.every(function loadRecordField(field) {
          return typeof field.name === 'string' &&
                 loadSchema(field.type, schema.namespace || namespace);
        });

      default:
        return typeName in symbols;
    }
  }
  if (loadSchema(data, '')) {
    this._lastLoaded = data;
    return true;
  } else {
    return false;
  }
};

// Validate datum against a schema.
// If schemaName is omitted, last loaded schema is used.
Schema.prototype.validate = function validate(rootDatum, schemaName) {
  var symbols = this._symbols;
  var rootSchema = this._schemaData(schemaName);

  function validateSchema(datum, schema) {
    var typeName;

    if (typeof schema === 'string') {
      typeName = schema;
    } else if (typeof schema === 'object') {
      if (Array.isArray(schema)) {
        return schema.some(function validateUnionMember(s) {
          return validateSchema(datum, s);
        });
      }
      typeName = schema.type;
    } else {
      return false;
    }

    switch (typeName) {
      case 'null':
        return datum === undefined;
      case 'boolean':
        return datum === true || datum === false;
      case 'string':
        return typeof datum === 'string';
      case 'bytes':
        return typeof datum === 'string' || Buffer.isBuffer(datum) ||
                                            Array.isArray(datum);
      case 'int':
        return parseInt(datum, 10) === datum;
      case 'long':
        // JavaScript cannot represent a 64-bit integer.
        return false;
      case 'float':
        return typeof datum === 'number';
      case 'double':
        return typeof datum === 'number';
      case 'array':
        if (!Array.isArray(datum)) {
          return false;
        }
        return datum.every(function validateArrayItem(d) {
          return validateSchema(d, schema.items);
        });
      case 'map':
        for (var key in datum) {
          if (!validateSchema(datum[key], schema.values)) {
            return false;
          }
        }
        return true;
      case 'enum':
        return schema.symbols.some(function validateEnumMember(symbol) {
          return symbol === datum;
        });
      case 'record':
        return datum &&
            schema.fields.every(function validateRecordField(field) {
          return (!(field.name in datum) && 'default' in field) ||
              validateSchema(datum[field.name], field.type);
        });

      case 'fixed':
        return typeof (Buffer.isBuffer(datum) || Array.isArray(datum)) &&
               datum.length === schema.size;

      default:
        return validateSchema(datum, symbols[typeName]);
    }
  }

  return validateSchema(rootDatum, rootSchema);
};

// Encode the datum to avro binary.
// If schemaName is omitted, last loaded schema is used.
module.exports.encode = function encode(rootDatum, schemaName) {
  var e = new Encoder();
  var symbols = this._symbols;
  var shortUnions = this._shortUnions;

  function encodeDatum(datum, schema) {
    var typeName = schema;
    var type;
    var keys;
    if (typeof schema !== 'string') {
      if (typeof schema === 'object') {
        if (Array.isArray(schema)) {
          // Union.
          if (datum === null || datum === undefined) {
            type = schema.indexOf("null");
            if (!~type) {
              return false;
            }
            e.writeInt(type);
            return true;
          }

          if (shortUnions === true && schema.length === 2) {
            if (schema[0] === 'null') {
              e.writeInt(1);
              return encodeDatum(datum, schema[1]);
            } else if (schema[1] === 'null') {
              e.writeInt(0);
              return encodeDatum(datum, schema[0]);
            }
          }

          if (typeof schema !== 'object') {
            return false;
          }

          keys = Object.keys(datum);
          if (keys.length !== 1) {
            return false;
          }

          type = schema.indexOf(keys[0]);
          if (!~type) {
            return false;
          }
          e.writeInt(type);
          return encodeDatum(datum[keys[0]], schema[type]);
        }
        typeName = schema.type;
      } else {
        return false;
      }
    }

    switch (typeName) {
      case 'null':
        return true;
      case 'boolean':
        e.writeBool(datum);
        return true;
      case 'string':
        e.writeString(datum.toString());
        return true;
      case 'bytes':
        return typeof datum === 'string' || Buffer.isBuffer(datum) ||
                                            Array.isArray(datum);
      case 'int':
        if (datum >= -2147483648 && datum <= 2147483647) {
          e.writeInt(parseInt(datum, 10));
          return true;
        }
        return false;
      case 'long':
        // JavaScript cannot represent a 64-bit integer.
        return false;
      case 'float':
        if (typeof datum === 'number') {
          e.writeFloat(datum);
          return true;
        }
        return false;
      case 'double':
        if (typeof datum === 'number') {
          e.writeDouble(datum);
          return true;
        }
        return false;
      case 'array':
        if (!Array.isArray(datum)) {
          return false;
        }
        e.writeInt(datum.length);
        if (datum.every(function encodeArrayItem(d) {
          return encodeDatum(d, schema.items);
        })) {
          e.writeInt(0);
          return true;
        }
        return false;
      case 'map':
        keys = Object.keys(datum);
        e.writeInt(keys.length);
        if (keys.every(function encodeMapKeyValue(key) {
          return encodeDatum(key, schema.keys) &&
                 encodeDatum(datum[key], schema.values);
        })) {
          e.writeInt(0);
          return true;
        }
        return false;
      case 'enum':
        if (typeof datum === 'number') {
          type = parseInt(datum, 10);
        } else {
          type = schema.symbols.indexOf(datum);
        }
        if (type < 0 || type >= schema.symbols.length) {
          return false;
        }
        e.writeInt(type);
        return true;
      case 'record':
        return schema.fields.every(function encodeRecordField(field) {
          return encodeDatum(datum[field.name], field.type);
        });
      case 'fixed':
        // Here's our little extension--we take Arrays, non-ascii strings.
        if (Array.isArray(datum) || typeof datum === 'string') {
          datum = new Buffer(datum);
        }

        if (Buffer.isBuffer(datum) && datum.length == schema.size) {
          e.writeBytes(datum);
          return true;
        }
        return false;
      default:
        return encodeDatum(datum, symbols[typeName]);
    }

  }
  return encodeDatum(rootDatum, this._schemaData(schemaName)) ?
          e.result() : null;
};
