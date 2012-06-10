
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

app.get('/', function (req, res, next) { 
    bookServer.books['6'].zanza = 'For an instant the two trains ran together, side by side. In that frozen moment, Elspeth witnessed a murder. Helplessly, she stared out of her carriage window as a man remorselessly tightened his grip around a woman’s throat. The body crumpled. Then the other train drew away.<br><br>But who, apart from Miss Marple, would take her story seriously? After all, there were no suspects, no other witnesses . . . and no corpse.'
    bookServer.books['11'].zanza = 'As Miss Marple sat basking in the Caribbean sunshine, she felt mildly discontented with life. True, the warmth eased her rheumatism, but here in paradise nothing ever happened.<br><br>Eventually, her interest was aroused by an old soldier’s yarn about a murderer he had known. Infuriatingly, just as he was about to show her a snapshot of this acquaintance, the Major was suddenly interrupted. A diversion that was to prove fatal.'
    bookServer.books['19'].zanza = 'The villagers of Chipping Cleghorn are agog with curiosity when the Gazette advertises “A murder is announced and will take place on Friday, October 29th, at Little Paddocks at 6.30 p.m.”<br><br>A childish practical joke? Or a spiteful hoax? Unable to resist the mysterious invitation, the locals arrive at Little Paddocks at the appointed time when, without warning, the lights go out and a gun is fired. When they come back on, a gruesome scene is revealed. An impossible crime? Only Miss Marple can unravel it.'
    bookServer.books['23'].zanza = 'Rex Fortescue, king of a financial empire, was sipping tea in his “counting house” when he suffered an agonizing and sudden death. On later inspection, the pockets of the deceased were found to contain traces of cereals.<br><br>Yet, it was the incident in the parlor which confirmed Miss Marple’s suspicion that here she was looking at a case of crime by rhyme.'
    bookServer.books['43'].zanza = 'When Cora Lansquenet is savagely murdered with a hatchet, the extraordinary remark she made the previous day at her brother Richard’s funeral suddenly takes on a chilling significance. At the reading of Richard’s will, Cora was clearly heard to say, “It’s been hushed up very nicely, hasn’t it.… But he was murdered, wasn’t he?”<br><br>In desperation, the family solicitor turns to Hercule Poirot to unravel the mystery.'
    bookServer.books['72'].zanza = '"Ten…"<br>Ten strangers are lured to an isolated island mansion off the Devon coast by a mysterious "U.N. Owen."<br><br>"Nine…"<br>At dinner a recorded message accuses each of them in turn of having a guilty secret, and by the end of the night one of the guests is dead.<br><br>"Eight…"<br>Stranded by a violent storm, and haunted by a nursery rhyme counting down one by one . . . one by one they begin to die.<br><br>"Seven…"<br>Who among them is the killer and will any of them survive?'
    bookServer.books['76'].zanza = 'Among the towering red cliffs of Petra, like some monstrous swollen Buddha, sits the corpse of Mrs. Boynton. A tiny puncture mark on her wrist is the only sign of the fatal injection that killed her.<br><br>With only twenty-four hours available to solve the mystery, Hercule Poirot recalled a chance remark he’d overheard back in Jerusalem: “You see, don’t you, that she’s got to be killed?” Mrs. Boynton was, indeed, the most detestable woman he’d ever met.'

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
