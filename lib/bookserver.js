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
		console.log('!!!Epub failed:', epub.bookid );
//            throw err;
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
/*                console.log(epub.metadata);
                console.log(epub.manifest);
                console.log(epub.spine);
                console.log(epub.guide);
                console.log(epub.toc);*/
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

exports.searchBooks = function (term, value) {
	var bookids = Object.keys(books);
	var hits = [];
	for (var i in bookids) {
		if (books[bookids[i]].metadata[term] == value) {
			hits.push(books[bookids[i]]);
		}
	}
	return hits;
}

exports.getFeedbooks = function (fbid, bookid, callback) {
	fs.mkdir(__dirname + '/fileserver/.epub/' + bookid, function() {
		fs.mkdir(__dirname + '/fileserver/.epub/' + bookid + '/original', function() {
			var req = request('http://www.feedbooks.com/book/' + fbid + '.epub');
			req.pipe(fs.createWriteStream('fileserver/.epub/' + bookid + '/original/' + bookid + '.epub'));
			req.on('end', function() {
				exports.loadBook(bookid, callback);
			});
		});
	});
}

exports.getFeedbooksCatalog = function (query, callback) {
	request('http://www.feedbooks.com/search.atom?query=' + escape(query.replace(' ', '+')), function (error, response, body) {
		if (!error && response.statusCode == 200) {
			if (callback) callback(body);
		}
	});
}
