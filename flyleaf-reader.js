
/**
 * Module dependencies.
 */

var express = require('express'),
    fs = require('fs'),
    hogan = require('./lib/expresshogan'),
    bookServer = require('./lib/bookserver');

var app = module.exports = express.createServer();

// Load books
require('child_process').exec('ls fileserver/.epub/', function (error, stdout, stderr) {
    var foundBooks = stdout.split('\n');
    for (i in foundBooks) {
        var bookid = foundBooks[i]; //.match(/fileserver\/.epub\/([^\/]*)\/original/);
        if (bookid && bookid != '') {
          console.log('Found: ' + bookid);
          bookServer.loadBook(bookid);
        }
    }
});


// Configure server
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view options', {layout: false});
	app.set('view cache', true);
	hogan.set('root', app.settings.views);
	hogan.set('cached', app.settings['view cache'])
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


/*
  Routes
  ------
                     Start: / -> index.html
     Pre-generated content: /read/:book/chapters/:chapter -> point request to: /.epub/:book/processed/:chapter
           Manifested item: /read/:book/items/:item -> resolve and point request to: /.epub/:book/unzipped/:itemhref
   Non-manifested resource: /read/:book/direct/:href -> point request to /.epub/:book/unzipped/:href
             Invoke reader: /read/:book/:chapter? -> reader.html
           Pass on generic: * -> static server
*/

// Protect hidden files
app.get(/\/\./, function(req, res, next) {
	res.send(404);
});

app.get('/a/:book/chapters/:chapter', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/' + req.params.chapter + '.xml';
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/a/:book/items/:itemid', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/unzipped/' + bookServer.getBook(req.params.book).manifest[req.params.itemid].href;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/a/:book/apple-touch:touchimage', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/apple-touch' + req.params.touchimage;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/a/:book/:chapter?', function(req, res, next) {
	book = bookServer.getBook(req.params.book);
  if (!book) {
    res.send(404);
  } else {
    res.render("reader.mustache", {
      locals: {
	      title: book.metadata.title,
        max_chapter: book.flow.length-1
	    }
    });
  }
})

if (app.settings.env === 'production') {
  app.listen(80, '10.0.0.182');
} else {
  app.listen(3000, 'localhost');
}
console.log("Flyleaf reader started (%s mode)", app.settings.env);

