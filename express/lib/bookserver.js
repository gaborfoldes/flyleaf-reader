

var EPub = require('./epub');

exports.books = {};

exports.loadBook = function (bookid) {
    var epub = exports.books[bookid] = new EPub(bookid);

    epub.on('error', function(err) {
        console.log('!!!Epub failed:', epub.bookid );
//            throw err;
    });

    epub.checkMimeType( epub.parse.bind(epub), function() {
        console.log('Unzipping:', epub.bookid );
        epub.expandBook( function () {
            epub.on('end', function(err) {
                epub.generateContent();
                epub.createAppleTouchImages();
                console.log('Epub processed:', epub.bookid );
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

