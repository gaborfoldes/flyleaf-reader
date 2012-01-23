
var EPub = require('./epub');
var url = require("url");
//var events = require('events');

this.epubs = {};

this.Server = function (bookroot, contentroot) {
    console.log('Epub server starting.');
    this.bookRoot = bookroot || '/';
    this.contentRoot = contentroot || 'epub/';
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

        var tocxml = '<xml><title>' + epub.metadata.title + ' :: Table of contents</title><article><div id="flyleaf-toc">';
        tocxml += '<div class="flyleaf-toc-entry"><a href="cover">Cover</a>';
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
                tocxml += '<div class="flyleaf-toc-entry"><a href="' + chapter + anchor + '">' + epub.toc[i].title + '</a></div>';
            }
        }
        tocxml += '</article></xml>';

        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.write(tocxml);
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

    if (chapter === undefined) { chapter = 0; } 

    var epub = exports.epubs[title];
    if (epub !== undefined && epub.spine.contents[chapter] != undefined) {
//        console.log('Epub server: found ' + title);
//        console.log('Epub server: ' + epub.spine.contents[chapter].id);
        epub.getChapter(epub.spine.contents[chapter].id, function(err, data){
            if(err){
                console.log(err);
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.write('Error: ' + err);
                res.end();
                return false;
            }
            var title = epub.spine.contents[chapter].title;
            if (!title) { title = 'Chapter ' + chapter; }
            title = epub.metadata.title + ' :: ' + title;
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.write('<xml><title>' + title + '</title>' + data + '</xml>');
/*            res.writeHead(200, {'Content-Type': 'text/html'});
            data.replace(/<\/?(article)>/ig, function (o, d) { return "body"; });
            data.replace(/<\/?(headext)>/ig, function (o, d) { return "head"; });
            res.write('<html>' + data + '</html>');
*/            res.end();
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

