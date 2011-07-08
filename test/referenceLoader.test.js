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

/*
exports.asyncGetter = testCase({
    setUp: function(callback) {        
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
    },
    
    'fetches the associated Domain': function(test) {
        test.expect(1);
        
        this.job.getDomain(function(err, domain) {
            if (err) throw err;
            
            test.same(domain.name, 'Plumbing Bros');
            test.done();
        });
    },
    
    'caches the domain object to prevent multiple DB fetches': function(test) {
        test.expect(2);
        
        var job = this.job;
        
        //Get booking the first time (from DB)
        job.getDomain(function(err, domain) {
            test.same(typeof domain._testCached, 'undefined');
            
            //Mark it as cached
            domain._testCached = true;
            
            //Get the booking again (cached)
            job.getDomain(function(err, domain2) {
                test.ok(domain2._testCached, 'Got the cached object');
                
                test.done();
            });
        });
    }
});
*/