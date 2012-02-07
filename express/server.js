
/**
 * Module dependencies.
 */

var express = require('express')
  , fs = require('fs')
  , hogan = require('./lib/expresshogan')
//  , routes = require('./routes')
  , bookServer = require('./lib/bookserver');
  
var app = module.exports = express.createServer();

require('child_process').exec('ls fileserver/.epub/*/unzipped/mimetype', function (error, stdout, stderr) {
    var foundBooks = stdout.split('\n');
    for (i in foundBooks) {
        var bookid = foundBooks[i].match(/fileserver\/.epub\/([^\/]*)\/unzipped\/mimetype/);
        if (bookid && bookid.length > 1) { bookServer.loadBook(bookid[1]); }
    }
});

//for( var i = 144; i <= 144; i++ ) { bookServer.loadBook( i.toString() ); }

//var debug = fs.createWriteStream('log/debug.log');
//debug.log = function() { debug.write(format.apply(this, arguments) + '\n') };

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  hogan.setRoot(app.settings.views);
  app.set('view options', {layout: false});
//  app.set('view cache', false);
  app.register('.mustache', hogan);
  app.set('view engine', hogan);
  app.use(express.logger(/*{stream: fs.createWriteStream('log/server.log')}*/));
//  app.use(express.bodyParser());
//  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function(){
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

/*app.get('/', function (req, res, next) {
    res.render('site/layout.mustache', {
        locals: {
            title: 'Flyleaf',
        },
        partials: {
            body: 'site/index.mustache',
            header: 'site/header.mustache'
        }
    })
})*/

app.get('/', function (req, res, next) { 
    res.render('site/layout.mustache', {
        locals: {
            title: 'Flyleaf',
            books: Object.keys(bookServer.books).map(function(key) { return bookServer.books[key]; })
        },
        partials: {
            body: 'site/books.mustache',
            header: 'site/header.mustache',
            tombstone: 'site/tombstone.mustache'
        }
    });
})

app.get('/read/:book/chapters/:chapter', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/processed/' + req.params.chapter + '.xml';
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/items/:itemid', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/unzipped/' + bookServer.books[req.params.book].manifest[req.params.itemid].href;
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/apple-touch:touchimage', function(req, res, next) {
    req.url = '/.epub/' + req.params.book + '/processed/apple-touch' + req.params.touchimage;
    console.log('Rerouting to:', req.url);
    return next();
})

app.get('/read/:book/:chapter?', function(req, res, next) {
    var book = bookServer.books[req.params.book];
    res.render("reader/reader.mustache", {
        locals: {
            title: book.metadata.title,
            max_chapter: book.flow.length-1
        }
    });
})

/*
app.get('/feedbooks/:fbid/:book', function(req, res, next) {
    bookServer.getFeedbooks(req.params.fbid, req.params.book, function() {
        res.redirect('/read/' + req.params.book + '/cover');
    });
})*/

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
