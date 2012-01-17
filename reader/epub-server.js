
var EPub = require('./epub');
var url = require("url");
//var events = require('events');

this.epubs = {};

this.Server = function (bookroot, contentroot) {
    console.log('Epub server starting.');
    this.bookRoot = bookroot || '/';
    this.contentRoot = contentroot || 'contents/';
}


this.Server.prototype.loadEpub = function (bookid, epubfile) {
    
    var epub = new EPub(bookid, epubfile, this.bookRoot, this.contentRoot);
    
    epub.on('error', function(err) {
        console.log('ERROR\n-----');
        throw err;
    }).on('end', function(err) {
        console.log('Epub loaded:');
        console.log(this.metadata);
//        console.log(this.manifest);
//        console.log(this.flow);
//        console.log(this.guide);
//        console.log(this.toc);
        exports.epubs[bookid] = epub;
    }).parse();

}

this.Server.prototype.serveTOC = function (req, res, title) {
    console.log('Epub server: table of contents for <' + title + '>');

    var epub = exports.epubs[title];
    if (epub !== undefined) {

        var tochtml = '<?xml version="1.0" encoding="UTF-8"?><div id="flyleaf-toc">';
        tochtml += '<div class="flyleaf-toc-entry"><a href="' + epub.bookroot + title + '/cover">Cover</a>';
        for (i = 0; i < epub.toc.length; i++) {
            
            toclink = epub.toc[i].href;
            linkparts = toclink && toclink.split("#");
            baselink = linkparts.shift() || "";

            for (j = 0; j < epub.spine.contents.length; j++) {
                if (baselink == epub.spine.contents[j].href) {
                    element = epub.spine.contents[j];
                    chapter = j;
                    break;
                }
            }
            
            anchor = "";
            if (linkparts.length) { anchor  =  "#" + linkparts.join("#"); }
                
            if (element) {
                tochtml += '<div class="flyleaf-toc-entry"><a href="' + epub.bookroot + title + '/' + chapter + anchor + '">' + epub.toc[i].title + '</a></div>';
            }
        }
        tochtml += '</div>';

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(tochtml);
        res.end();

    } else {
        console.log('Epub server: no book with title <' + title + '>');
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not found");
        res.end();
        return false;
    }

}

this.Server.prototype.serveChapter = function (req, res, title, chapter) {
    console.log('Epub server: fetching book "' + title + '", chapter #' + chapter);
//    var that = this;
//    var promise = new(events.EventEmitter);

    if (chapter === undefined) { chapter = 0; } 

    var epub = exports.epubs[title];
    if (epub !== undefined) {
//        console.log('Epub server: found ' + title);
        epub.getChapter(epub.spine.contents[chapter].id, function(err, data){
            if(err){
                console.log(err);
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.write('Error: ' + err);
                res.end();
                return false;
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(data);
            res.end();
        });
    } else {
        console.log('Error: no book with title <' + title + '>');
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not found");
        res.end();
        return false;
    }

}

this.Server.prototype.serveAsset = function (req, res, title, id) {
    console.log('Epub server: fetching book "' + title + '", asset id: ' + id);

    var epub = exports.epubs[title];
    if (epub !== undefined) {
        epub.getAsset(id, function(err, data, mimetype){
            if(err){
                console.log(err);
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.write('Error: ' + err);
                res.end();
                return false;
            }
            res.writeHead(200, {'Content-Type': mimetype});
            res.write(data);
            res.end();
        });
    } else {
        console.log('Error: no book with title <' + title + '>');
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not found");
        res.end();
        return false;
    }

}

this.Server.prototype.serveCover = function (req, res, title) {
    console.log('Epub server: fetching book "' + title + '", cover art');

    var epub = exports.epubs[title];
    if (epub !== undefined) {
        cover = epub.metadata.cover;
        if (cover && ((epub.manifest[cover]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
            id = cover;
        } else {
            id = epub.guide['cover'].id;
        }
        if (id) {
            epub.getAsset(id, function(err, data, mimetype) {
                if(err){
                    console.log(err);
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.write('Error: ' + err);
                    res.end();
                    return false;
                }
                res.writeHead(200, {'Content-Type': mimetype});
                res.write(data);
                res.end();
            });
        } else {
            console.log('Error: no cover found for <' + title + '>');
            res.writeHead(404, {"Content-Type": "text/plain"});
            res.write("404 Not found");
            res.end();
            return false;
        }
    } else {
        console.log('Error: no book with title <' + title + '>');
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not found");
        res.end();
        return false;
    }

}

