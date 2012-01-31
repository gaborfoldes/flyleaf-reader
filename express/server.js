
/**
 * Module dependencies.
 */

var express = require('express')
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

for( var i = 144; i <= 144; i++ ) { bookServer.loadBook( i.toString() ); }



// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set("view options", {layout: true});
/*  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });*/
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
app.get('/', function (req, res, next) { 
    res.render('index', {
        title: 'Flyleaf - Bookshelf',
        locals: { books: bookServer.books }
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
    req.url = '/reader.html';
    console.log('Rerouting to:', req.url);
    return next();
//    res.render('reader.html');
})

app.get('/feedbooks/:fbid/:book', function(req, res, next) {
    bookServer.getFeedbooks(req.params.fbid, req.params.book, function() {
        res.redirect('/read/' + req.params.book + '/cover');
    });
})

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
