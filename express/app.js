
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , EPub = require('./epub')
  , imageMagick = require('imagemagick');

var app = module.exports = express.createServer();

var books = {};

function loadBooks () {
    console.log('Books registered:', arguments);
    for (i = 0, len = arguments.length; i < len; i++) {
        books[arguments[i]] = new EPub(arguments[i]);
        books[arguments[i]].on('error', function(err) {
            console.log('Epub failed:', this.bookid );
            throw err;
        }).on('end', function(err) {
            console.log('Epub loaded:', this.bookid );
            createAppleTouchImages(this.bookid);
//            books[this.bookid] = epub;
        }).parse();
    }
}

loadBooks('stevejobs','alice');

function createAppleTouchImages(bookid) {
        
    var epub = books[bookid];
    var id, cover = epub.metadata.cover;
    if (cover && ((epub.manifest[cover]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        id = cover;
    } else {
        id = epub.guide['cover'].id;
    }
    if (id && ((epub.manifest[id]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-thumbnail', '72x72',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '72x72',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-icon-72x72-precomposed.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-thumbnail', '114x114',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '114x114',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-icon-114x114-precomposed.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-thumbnail', '57x57',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '57x57',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-icon-precomposed.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-thumbnail', '768x1004',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '768x1004',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-startup-ipad-portrait.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-rotate', '90',
            '-thumbnail', '748x1024',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '748x1024',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-startup-ipad-landscape.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
        imageMagick.convert([
            'fileserver/.epub/' + epub.bookid + '/unzipped/' + epub.manifest[id].href,
            '-thumbnail', '320x460',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '320x460',
            'fileserver/.epub/' + epub.bookid + '/processed/apple-touch-startup-iphone.png'
        ], function(err, metadata) {
            if (err) throw err;
        });
    }
}

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set("view options", {layout: false});
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });
  app.use(express.logger());
//  app.use(express.bodyParser());
//  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
//  app.use(express.staticCache());
  app.use(express.static(__dirname + '/fileserver'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.staticCache());
  app.use(express.static(__dirname + '/fileserver', {maxAge: oneYear}));
  app.use(express.errorHandler()); 
});


// Routes
/*                   Start: / -> index.html
     Pre-generated content: /read/:book/chapters/:chapter -> point request to: /.epub/:book/processed/:chapter
           Manifested item: /read/:book/items/:item -> resolve and point request to: /.epub/:book/unzipped/:itemhref
   Non-manifested resource: /read/:book/direct/:href -> point request to /.epub/:book/unzipped/:href
             Invoke reader: /read/:book/:chapter? -> reader.html
           Pass on generic: * -> static server
*/

// Protect hidden files
app.get(/\/\./, function(req, res, next) {
    res.redirect('/');
    //return next(new Error('Permission denied.'));
});

// index.html
app.get('/', routes.index);

app.get('/read/:book/chapters/:chapter', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/processed/' + req.params.chapter + '.xml';
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/items/:itemid', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/unzipped/' + books[req.params.book].manifest[req.params.itemid].href;
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/apple-touch:touchimage', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/processed/apple-touch' + req.params.touchimage;
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/:chapter?', function(req, res, next) {
    res.render('reader.html');
})


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
