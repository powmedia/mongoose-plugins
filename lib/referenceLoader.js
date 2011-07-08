/**
 * ReferenceLoader Mongoose plugin 
 * 
 */
 

//Dependencies
var mongoose = require('mongoose');

module.exports = function referenceLoader(options) {
    //Check for required options
    ['idKey', 'virtualKey', 'modelName'].forEach(function(key) {
        if (typeof options[key] === 'undefined')
            throw new Error('Missing required option: ' + key);
    });
    
    var idKey = options.idKey,
        virtualKey = options.virtualKey,
        modelName = options.modelName,
        cachedKey = '_' + virtualKey;
                
    
    return function referenceLoader(schema) {
        //Add the virtual
        schema.virtual(virtualKey)
            .get(function() {
                if (!this[cachedKey]) {
                    var msg = modelName+' has not been loaded yet. Use get'+modelName+'() instead.';                    
                    throw new Error(msg);
                }

                return this[cachedKey];
            })
            .set(function(val) {
                var model = mongoose.model(modelName);

                //Must be a Domain model instance
                if (!(val instanceof model))
                    throw new Error('"'+virtualKey+'" must be a '+modelName+' model');

                //Check the ID matches current ID (if set)
                if (this[idKey] && this[idKey].toHexString() !== val._id.toHexString()) {
                    throw new Error(modelName+' must be the same as identified by the "'+idKey+'" attribute');
                }

                //Save the ID (this gets persisted to DB)
                this[idKey] = val._id;

                //Store the business object for accessing it later without a DB lookup
                this[cachedKey] = val;
            });
        
        
        //Add the async get method which loads the referenced document
        schema.method('get'+modelName, function(callback) {
            //Check for a locally cached version first
            if (this[cachedKey]) return callback(null, this[cachedKey]);

            var model = mongoose.model(modelName),
                self = this;

            model.findOne({ _id: this[idKey] }, function(err, instance) {
                if (err) return callback(err);
                if (!instance) return callback(new Error(modelName + ' not found'));

                //Cache the object to prevent multiple fetches from DB
                self[cachedKey] = instance;

                return callback(null, instance);
            });
        });
    };
};
