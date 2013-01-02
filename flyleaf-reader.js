
/**
 * Module dependencies.
 */

var express = require('express'),
    fs = require('fs'),
    hogan = require('./lib/expresshogan'),
    bookServer = require('./lib/bookserver');

var app = module.exports = express.createServer();

// Load books
bookServer.parseBooks();

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
	app.use(express.static(__dirname + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	var oneYear = 31557600000;
	app.use(express.staticCache());
	app.use(express.static(__dirname + '/public', {maxAge: oneYear}));
	app.use(express.errorHandler()); 
});


/*
  Routes
  ------
                    Hidden: /. -> 404
     Pre-generated content: /view/:book/chapters/:chapter -> point request to: /.epub/:book/processed/:chapter
           Manifested item: /view/:book/items/:item -> resolve and point request to: /.epub/:book/unzipped/:itemhref
   Non-manifested resource: /view/:book/direct/:href -> point request to /.epub/:book/unzipped/:href
             Invoke reader: /view/:book/:chapter? -> reader.html
     Refresh book metadata: /refresh
           Pass on generic: * -> static server
*/

// Protect hidden files
app.get(/\/\./, function(req, res, next) {
	res.send(404);
});

app.get('/view/:book/chapters/:chapter', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/' + req.params.chapter + '.xml';
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/view/:book/items/:itemid', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/unzipped/' + bookServer.getBook(req.params.book).manifest[req.params.itemid].href;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/view/:book/apple-touch:touchimage', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/apple-touch' + req.params.touchimage;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/view/:book/:chapter?', function(req, res, next) {
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

app.get('/refresh', function(req, res, next) {
  console.log('Reloading books.');
  bookServer.parseBooks();
  res.send(200);
})

app.get('/refresh/:book', function(req, res, next) {
  console.log('Loading book:' + req.params.book);
  bookServer.loadBook(req.params.book);
  res.send(200);
})

app.get('/search', function(req, res, next) {
  console.log('Searching all books.');
  var booklist = bookServer.getBookList();
  res.send(Object.keys(booklist));
})

app.get('/search/:book', function(req, res, next) {
  console.log('Getting book metadata:' + req.params.book);
  var book = bookServer.getBook(req.params.book),
      result = {};
  result[book.bookid] = book.metadata;
  res.send(result);
})

app.get('/search/:term/:value', function(req, res, next) {
  console.log('Searching books:' + req.params.term + ' = ' + req.params.value);
  var booklist = bookServer.searchBooks(req.params.term, req.params.value),
      result = {};
  for (i in booklist) {
    result[booklist[i].bookid] = booklist[i].metadata;
  };
  res.send(result);
})


/*
Start server
*/

if (app.settings.env === 'production') {
  app.listen(80, '10.0.0.182');
} else {
  app.listen(3000, 'localhost');
}
console.log("Flyleaf reader started (%s mode)", app.settings.env);

