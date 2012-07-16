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

exports.getBook = function (bookid) {
  return books[bookid];
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

exports.setSample = function () {
		books['6'].zanza = 'For an instant the two trains ran together, side by side. In that frozen moment, Elspeth witnessed a murder. Helplessly, she stared out of her carriage window as a man remorselessly tightened his grip around a woman’s throat. The body crumpled. Then the other train drew away.<br><br>But who, apart from Miss Marple, would take her story seriously? After all, there were no suspects, no other witnesses . . . and no corpse.'
	  books['11'].zanza = 'As Miss Marple sat basking in the Caribbean sunshine, she felt mildly discontented with life. True, the warmth eased her rheumatism, but here in paradise nothing ever happened.<br><br>Eventually, her interest was aroused by an old soldier’s yarn about a murderer he had known. Infuriatingly, just as he was about to show her a snapshot of this acquaintance, the Major was suddenly interrupted. A diversion that was to prove fatal.'
	  books['19'].zanza = 'The villagers of Chipping Cleghorn are agog with curiosity when the Gazette advertises “A murder is announced and will take place on Friday, October 29th, at Little Paddocks at 6.30 p.m.”<br><br>A childish practical joke? Or a spiteful hoax? Unable to resist the mysterious invitation, the locals arrive at Little Paddocks at the appointed time when, without warning, the lights go out and a gun is fired. When they come back on, a gruesome scene is revealed. An impossible crime? Only Miss Marple can unravel it.'
	  books['23'].zanza = 'Rex Fortescue, king of a financial empire, was sipping tea in his “counting house” when he suffered an agonizing and sudden death. On later inspection, the pockets of the deceased were found to contain traces of cereals.<br><br>Yet, it was the incident in the parlor which confirmed Miss Marple’s suspicion that here she was looking at a case of crime by rhyme.'
	  books['43'].zanza = 'When Cora Lansquenet is savagely murdered with a hatchet, the extraordinary remark she made the previous day at her brother Richard’s funeral suddenly takes on a chilling significance. At the reading of Richard’s will, Cora was clearly heard to say, “It’s been hushed up very nicely, hasn’t it.… But he was murdered, wasn’t he?”<br><br>In desperation, the family solicitor turns to Hercule Poirot to unravel the mystery.'
	  books['72'].zanza = '"Ten…"<br>Ten strangers are lured to an isolated island mansion off the Devon coast by a mysterious "U.N. Owen."<br><br>"Nine…"<br>At dinner a recorded message accuses each of them in turn of having a guilty secret, and by the end of the night one of the guests is dead.<br><br>"Eight…"<br>Stranded by a violent storm, and haunted by a nursery rhyme counting down one by one . . . one by one they begin to die.<br><br>"Seven…"<br>Who among them is the killer and will any of them survive?'
	  books['76'].zanza = 'Among the towering red cliffs of Petra, like some monstrous swollen Buddha, sits the corpse of Mrs. Boynton. A tiny puncture mark on her wrist is the only sign of the fatal injection that killed her.<br><br>With only twenty-four hours available to solve the mystery, Hercule Poirot recalled a chance remark he’d overheard back in Jerusalem: “You see, don’t you, that she’s got to be killed?” Mrs. Boynton was, indeed, the most detestable woman he’d ever met.'
}



