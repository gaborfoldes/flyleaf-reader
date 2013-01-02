var EPub = require('./epub'),
	request = require('request'),
	fs = require('fs');

var books = {};

exports.getBookList = function () {
	return books;
}

exports.size = function() {
    var size = 0, key;
    for (key in books) {
        if (books.hasOwnProperty(key)) {
			size++;
		}
    }
    return size;
};

exports.loadBook = function (bookid, callback) {
	var epub = books[bookid] = new EPub(bookid);

	epub.on('error', function(err) {
		console.log('--epub failed:', epub.bookid );
		throw err;
	});

//epub.parse.bind(epub);
	epub.checkMimeType(function() {
		epub.on('end', function() {
			if (callback) callback();
		}).parse();
	}, function() {
		console.log('Unzipping:', epub.bookid );
		epub.expandBook( function () {
			epub.on('end', function(err) {
				epub.generateContent();
				epub.createAppleTouchImages();
				console.log('Epub processed:', epub.bookid );
//                console.log(epub.metadata);
//                console.log(epub.manifest);
//                console.log(epub.spine);
//                console.log(epub.guide);
//                console.log(epub.toc);
				if (callback) {
					callback();
				}
			});
			epub.parse();
		});
	});
}

exports.loadBooks = function (booklist) {
	var i, len;
	for (i = 0, len = booklist.length; i < len; i++) {
		exports.loadBook(booklist[i]);
	}
}

exports.getBook = function (bookid) {
  return books[bookid];
}


exports.searchBooks = function (term, value) {
	var bookids = Object.keys(books),
	    re = new RegExp(value, "i"),
	    hits = [];
	for (var i in bookids) {
//		if (books[bookids[i]].metadata[term] == value) {
		if (books[bookids[i]].metadata[term].match(re)) {
			hits.push(books[bookids[i]]);
		}
	}
	return hits;
}

exports.parseBooks = function () {
	var bookids = Object.keys(books);

	require('child_process').exec('ls public/.epub/', function (error, stdout, stderr) {
	    var foundBooks = stdout.split('\n');
	    for (i in foundBooks) {
	        var bookid = foundBooks[i]; //.match(/fileserver\/.epub\/([^\/]*)\/original/);
	        if (bookid && bookid != '' && !(i in bookids)) {
	          console.log('Found: ' + bookid);
	          exports.loadBook(bookid);
	        }
	    }
	});
}


