
/**
 * Module dependencies.
 */

var express = require('express'),
	fs = require('fs'),
	hogan = require('./lib/expresshogan'),
//	routes = require('./routes'),
	bookServer = require('./lib/bookserver');

var app = module.exports = express.createServer();


bookServer.loadBook('agile');
//bookServer.loadBook('postwar');

//var debug = fs.createWriteStream('log/debug.log');
//debug.log = function() { debug.write(format.apply(this, arguments) + '\n') };

// Configuration
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

/*
app.get('/load', function (req, res, next) {
  bookServer.setSample();
  req.url = '/';
	return next();
});

app.get('/', function (req, res, next) {
    res.render('site/layout.mustache', {
        locals: {
            title: 'Flyleaf',
            page: {
                username: 'QueenOfCrime',
                fullname: 'Agatha Christie',
                profilepic: '/img/agatha.png',
                about: 'Agatha Christie is known throughout the world as the Queen of crime. Her books have sold over a billion copies in the English language with another billion in 44 foreign languages. She is the most widely published author of all time in any language, out-sold by only the Bible and Shakespeare. She is the author of 79 crime novels and a short story collections, 19 plays, and 6 novels written under the name of Mary Westmacott.<br><br>Agatha Christie was born in Torquay. Her first novel, The Mysterious Affair at Styles, was written toward the end of the First World War, in which she served as a VAD. In it she created Hercules Poirot, the little Belgian detective who was destined to become the most popular detective in crime fiction since Sherlock Holmes. It was eventually published by The Bodley Head in 1920.<br><br>In 1926, after averaging a book a year, Agatha Christie wrote her masterpiece. The Murder of Roger Ackroyd was the first of her books to be published by Collins and marked the beginning of author-publisher relationship which lasted for fifty years and well over seventy books. The Murder of Roger Ackroyd was also the first of Agatha Christie\'s books to be dramatized - under the name Alibi - and to have a successful run in the West End. The Mousetrap, her most famous play of all, is the longest-running play in history.<br><br>Agatha Christie was made a Dame in 1971. Her last two books to be published were Curtain: Poirot\'s Last Case in 1975, and Sleeping Murder, featuring the deceptively mild Miss Marple, in 1976. Both were bestsellers. Agatha Christie also wrote four non-fiction works including an autobiography and the delightful Come, Tell Me How You Live, which celebrates the many expeditions she shared with her archaeologist husband Sir Max Mallowan.',
                location: 'Wallingford, UK'
            },
            books: bookServer.searchBooks('creator', 'Agatha Christie') //Object.keys(bookServer.books).map(function(key) { return bookServer.books[key]; })
        },
        partials: {
            body: 'site/index.mustache',
            loginbox: 'site/loginbox.mustache',
            header: 'site/header.mustache',
            tombstone: 'site/tombstone.mustache'
        }
    });
})
*/

app.get('/read/:book/chapters/:chapter', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/' + req.params.chapter + '.xml';
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/read/:book/items/:itemid', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/unzipped/' + bookServer.getBook(req.params.book).manifest[req.params.itemid].href;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/read/:book/apple-touch:touchimage', function(req, res, next) {
	req.url = '/.epub/' + req.params.book + '/processed/apple-touch' + req.params.touchimage;
	console.log('Rerouting to:', req.url);
	return next();
})

app.get('/read/:book/:chapter?', function(req, res, next) {
	book = bookServer.getBook(req.params.book);
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

    app.listen(80, '10.0.0.182');
//console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

//    app.listen(3001, '50.18.221.126', function() {
//	    console.log("Listening on port %d in %s mode", app.address().port, app.settings.env);
//	});