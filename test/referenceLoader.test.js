/**
* referenceLoader Mongoose plugin tests
* 
* Run $ nodeunit
* 
* @author Charles Davison charlie@powmedia.co.uk
*/

//Dependencies
var mongoose = require('mongoose'),
    testCase = require('nodeunit').testCase,
    Schema = mongoose.Schema,
    referenceLoader = require('../lib/referenceLoader');


//Set up schemas
var authorSchema = new Schema({
    name: String
});

var postSchema = new Schema({
    title: String,
    authorId: Schema.ObjectId
});
postSchema.plugin(referenceLoader({
    idKey: 'authorId',
    virtualKey: 'author',
    modelName: 'Author'
}));

//Create models
mongoose.model('Post', postSchema);
mongoose.model('Author', authorSchema);

//Get models
var Post = mongoose.model('Post'),
    Author = mongoose.model('Author');


exports.virtualSetter = {
    'requires a model instance': function(test) {
        test.expect(1);
        
        try {
            var post = new Post({
                title: 'Article title',
                authorId: undefined,
                author: '000000000000000000000001'
            });
        } catch (e) {
            test.same(e.message, '"author" must be a Author model');
            return test.done();
        }

        //Fail if the exception wasn't caught
        test.ok(false, 'Expecting an exception');
        test.done();
    },
    
    'sets the [idKey] attribute if not already set': function(test) {
        var author = new Author({
            _id: '000000000000000000000001',
            name: 'John Smith'
        });
        
        var post = new Post({
            title: 'Post title',
            authorId: undefined,
            author: author
        });
        
        test.same(post.authorId, author._id);
        test.done();
    },
    
    'if the job already has a reference ID, it must match the given document ID': function(test) {
        test.expect(1);
        
        try {
            var author = new Author({
                _id: '000000000000000000000001',
                name: 'John Smith'
            });

            var post = new Post({
                title: 'Post title',
                authorId: '000000000000000000000002'
            });
            
            post.author = author;
        } catch (e) {
            test.same(e.message, 'Author must be the same as identified by the "authorId" attribute');
            return test.done();
        }
        
        //Fail if the exception wasn't caught
        test.ok(false, 'Expecting an exception');
        test.done();
    },
    
    'caches the referenced document for fetching later without a DB request': function(test) {
        var author = new Author({
            _id: '000000000000000000000001',
            name: 'John Smith'
        });

        var post = new Post({
            title: 'Post title',
            authorId: '000000000000000000000001'
        });
        
        post.author = author;
        
        test.same(post.author, author);
        test.done();
    }
};


exports.virtualGetter = {
    'returns the supplied domain': function(test) {
        var author = new Author({
            name: 'John Smith'
        });

        var post = new Post({
            title: 'Post title',
            author: author
        });
        
        test.same(post.author, author);
        test.done();
    }
};



exports.asyncGetter = testCase({
    /*setUp: function(callback) {      
        //Load a business
        fixtures.load({
            Domain: [
                getDomain({
                    _id: '000000000000000000000001',
                    name: 'Plumbing Bros'
                })
            ]
        }, callback);
        
        //Create booking attached to the business
        this.job = createJob({ did: '000000000000000000000001' });
    },*/
    
    setUp: function(callback) {
        //Create models
        this.author = new Author({
            _id: '000000000000000000000005',
            name: 'William Shakespeare'
        });
        
        this.post = new Post({
            title: 'Post title',
            authorId: '000000000000000000000005'
        });
        
        //Save the original method which will be mocked
        this._findOne = Author.findOne;
        
        callback();
    },
    
    tearDown: function(callback) {
        //Return the original method
        Author.findOne = this._findOne;
        
        callback();
    },
    
    'fetches the referenced document': function(test) {
        test.expect(2);
        
        var post = this.post,
            author = this.author;
        
        //Mock the DB request
        Author.findOne = function(criteria, callback) {
            //Make sure the correct ID was requested
            test.same(criteria._id.toHexString(), '000000000000000000000005');
            
            //Return the author, as if this was the DB returning it
            callback(null, author);
        }
        
        //Check that the method fetches the correct referenced object
        post.getAuthor(function(err, author2) {
            if (err) throw err;
            
            test.same(author2, author);
            
            test.done();
        });
    },
    
    'caches the domain object to prevent multiple DB fetches': function(test) {
        test.expect(3);
        
        var post = this.post,
            author = this.author;
        
        //Mock the DB request
        Author.findOne = function(criteria, callback) {
            //Make sure the correct ID was requested
            test.same(criteria._id.toHexString(), '000000000000000000000005');
            
            //Return the author, as if this was the DB returning it
            callback(null, author);
        }
        
        //Get doc the first time (from DB)
        post.getAuthor(function(err, author2) {
            test.same(typeof author2._testCached, 'undefined');
            
            //Mark it as cached
            author2._testCached = true;
            
            //Get the doc again (cached)
            post.getAuthor(function(err, author3) {
                test.ok(author3._testCached, 'Got the cached object');
                
                test.done();
            });
        });
    }
});
