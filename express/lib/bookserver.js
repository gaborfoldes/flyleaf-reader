

var EPub = require('./epub');

exports.books = {};

exports.loadBook = function (bookid) {
    var epub = exports.books[bookid] = new EPub(bookid);

    epub.on('error', function(err) {
            throw err;
    });

    epub.on('end', function(err) {
        console.log('Epub loaded:', epub.bookid );
        epub.generateContent();
        epub.createAppleTouchImages();
    });

    epub.expandBook( function () {
        epub.parse();
    });
}

exports.loadBooks = function () {
    var i, len;
    for (i = 0, len = arguments.length; i < len; i++) {
        exports.loadBook(arguments[i]);
    }
}

