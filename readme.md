# node-avro

Verify that JSON objects match schemas & encode them to AVRO binary.

        var Schema = require('avro-schema').Schema;
        var schema = new Schema();
        schema.load("myfile.avsc");
        // All types from myfile.avsc are available.
        schema.load("another.avsc");
        // Verifies that object o matches the schema from another.avsc
        schema.verify(o);
        // Verifies that object o matches a particular type name.
        schema.verify(o, 'MyFileType');
        // Now encode it to avro binary format.
        var buffer = schema.encode(o);
