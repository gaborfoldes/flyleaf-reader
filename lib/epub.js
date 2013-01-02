var fs = require('fs'),
	XML2JS = require("xml2js").Parser,
	utillib = require("util"),
	EventEmitter = require('events').EventEmitter,
	imageMagick = require('imagemagick');

//TODO: Cache parsed data

/**
 *  new EPub(fname[, paths.contents][, bookroot])
 *  - fname (String): filename for the ebook
 *  - paths.contents (String): URL prefix for images
 *  - bookroot (String): URL prefix for links
 *
 *  Creates an Event Emitter type object for parsing epub files
 *
 *      var epub = new EPub('title');
 *      epub.on('end', function () {
 *          console.log(epub.spine);
 *      }).on('error', function (error) {
 *          throw error;
 *      }).parse();
 *
 *  Image and link URL format is:
 *
 *      paths.contents + img_id + img_zip_path
 *
 *  So an image "logo.jpg" which resides in "OPT/" in the zip archive
 *  and is listed in the manifest with id "logo_img" will have the
 *  following url (providing that paths.contents is "/images/"):
 *
 *      /images/logo_img/OPT/logo.jpg
 **/
function EPub(bookid, paths) {
	EventEmitter.call(this);
	this.bookid = bookid;
	this.zanza = '';
	this.paths = {
		base: 'public/.epub/' + bookid + '/',
		original: 'original/',
		unzipped: 'unzipped/',
		processed: 'processed/',
		epubfile: bookid + '.epub',
		contents: 'items/'
	};

	for (var key in paths) {
		this.paths[key] = paths[key].trim();
		if (this.paths[key].substr(-1) != "/" && key != 'epubfile') {
			this.paths[key] += "/";
		}
	}

	this.unzippedpath = this.paths.base + this.paths.unzipped;
	this.processedpath = this.paths.base + this.paths.processed;
	this.epubpath = this.paths.base + this.paths.original + this.paths.epubfile;
};

// descendent of EventEmitter
utillib.inherits(EPub, EventEmitter);

EPub.prototype.parse = function () {
	var that = this;

	console.log('Parsing:', this.bookid );

	this.containerFile = false;
	this.mimeFile = false;
	this.rootFile = false;

	this.metadata = {};
	this.manifest = {};
	this.spine = {toc: false, contents: []};
	this.guide = {};
	this.flow = [];
	this.toc = [];
	this.cover = null;

	this.checkMimeType( this.getRootFiles.bind(this), function() {
		that.emit("error", new Error("Cannot find EPUB (no mimetype)"));
	});
};


EPub.prototype.checkMimeType = function (callback, fail) {
	var that = this;

	fs.readFile(this.unzippedpath + 'mimetype', function (err, data) {
		if (err) {
			fail();
			return false;
		}
		var txt = data.toString("utf-8").toLowerCase().trim();

		if (txt != "application/epub+zip") {
			that.emit("error", new Error("Unsupported mime type"));
			return false;
		}

		callback();
	});
};

/**
 *  EPub#getRootFiles() -> undefined
 *
 *  Looks for a "meta-inf/container.xml" file and searches for a
 *  rootfile element with mime type "application/oebps-package+xml".
 *  On success calls the rootfile parser
 **/
EPub.prototype.getRootFiles = function () {
	var that = this;

	fs.readFile(this.unzippedpath + 'META-INF/container.xml', function (err, data) {
		if (err) {
			that.emit("error", new Error("No container file found"));
			return;
		}
		var xml = data.toString("utf-8").trim(); //.toLowerCase().trim();
		xmlparser = new XML2JS();

		xmlparser.on("end", function (result) {
			if (!result.rootfiles || !result.rootfiles.rootfile) {
				that.emit("error", new Error("No rootfiles found"));
				return;
			}

			var rootfile = result.rootfiles.rootfile,
				filename = false, i, len;

            if (Array.isArray(rootfile)) {
                for (i = 0, len = rootfile.length; i < len; i++) {
                    if (rootfile[i]["@"]["media-type"] &&
                            rootfile[i]["@"]["media-type"] == "application/oebps-package+xml" &&
                            rootfile[i]["@"]["full-path"]) {
                        filename = rootfile[i]["@"]["full-path"];
                        break;
                    }
                }
            } else if (rootfile["@"]) {
                if (rootfile["@"]["media-type"]  !=  "application/oebps-package+xml" || !rootfile["@"]["full-path"]) {
                    that.emit("error", new Error("Rootfile in unknown format"));
                    return;
                }
                filename = rootfile["@"]["full-path"];
            }

            if (!filename) {
                that.emit("error", new Error("Rootfile not found"));
                return;
            } else {
                that.rootFile = filename;
            }

            that.handleRootFile();
            
        });

        xmlparser.on("error", function (err) {
            that.emit("error", new Error("Parsing container XML failed"));
            return;
        });

        xmlparser.parseString(xml);

    });
};

/**
 *  EPub#handleRootFile() -> undefined
 *
 *  Parser the rootfile XML and calls rootfile parser
 **/
EPub.prototype.handleRootFile = function () {
    var that = this;

    fs.readFile(this.unzippedpath + this.rootFile, function (err, data) {
        if (err) {
            that.emit("error", new Error("Reading rootfile failed"));
            return;
        }
        var xmlparser = new XML2JS();

        xmlparser.on("end", function (rootfile) {

            var i, len, keys, keyparts, key;
            keys = Object.keys(rootfile);
            for (i = 0, len = keys.length; i < len; i++) {
                keyparts = keys[i].split(":");
                key = (keyparts.pop() || "").toLowerCase().trim();
                switch (key) {
                case "metadata":
                    that.parseMetadata(rootfile[keys[i]]);
                    break;
                case "manifest":
                    that.parseManifest(rootfile[keys[i]]);
                    break;
                case "spine":
                    that.parseSpine(rootfile[keys[i]]);
                    break;
                case "guide":
                    that.parseGuide(rootfile[keys[i]]);
                    break;
                }
            }

            if (that.spine.toc) {
                that.parseTOC();
            } else {
                that.emit("end");
            }

        }).on("error", function (err) {
            that.emit("error", new Error("Parsing rootfile XML failed"));
            return;
        }).parseString(data.toString("utf-8"));

    });
};

/**
 *  EPub#parseRootFile() -> undefined
 *
 *  Parses elements "metadata," "manifest," "spine" and TOC.
 *  Emits "end" if no TOC
 **/
EPub.prototype.parseRootFile = function (rootfile) {

};

/**
 *  EPub#parseMetadata() -> undefined
 *
 *  Parses "metadata" block (book metadata, title, author etc.)
 **/
EPub.prototype.parseMetadata = function (metadata) {
    var i, j, len, keys, keyparts, key;

    keys = Object.keys(metadata);
    for (i = 0, len = keys.length; i < len; i++) {
        keyparts = keys[i].split(":");
        key = (keyparts.pop() || "").toLowerCase().trim();
        switch (key) {
        case "publisher":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.publisher = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
            } else {
                this.metadata.publisher = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
            }
            break;
        case "language":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.language = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").toLowerCase().trim();
            } else {
                this.metadata.language = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").toLowerCase().trim();
            }
            break;
        case "title":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.title = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
            } else {
                this.metadata.title = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
            }
            break;
        case "subject":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.subject = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
            } else {
                this.metadata.subject = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
            }
            break;
        case "description":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.description = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
            } else {
                this.metadata.description = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
            }
            break;
        case "creator":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.creator = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
                this.metadata.creatorFileAs = String(metadata[keys[i]][0] && metadata[keys[i]][0]['@'] && metadata[keys[i]][0]['@']["opf:file-as"] || this.metadata.creator).trim();
            } else {
                this.metadata.creator = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
                this.metadata.creatorFileAs = String(metadata[keys[i]]['@'] && metadata[keys[i]]['@']["opf:file-as"] || this.metadata.creator).trim();
            }
            this.metadata.creator = this.metadata.creator.replace(/(.*)(\s*,\s*)(.*)/g, function (o, a, b, c) {
                return c + ' ' + a;
            });
            break;
        case "date":
            if (Array.isArray(metadata[keys[i]])) {
                this.metadata.date = String(metadata[keys[i]][0] && metadata[keys[i]][0]["#"] || metadata[keys[i]][0] || "").trim();
            } else {
                this.metadata.date = String(metadata[keys[i]]["#"] || metadata[keys[i]] || "").trim();
            }
            break;
        case "identifier":
            if (metadata[keys[i]]["@"] && metadata[keys[i]]["@"]["opf:scheme"] == "ISBN") {
                this.metadata.ISBN = String(metadata[keys[i]]["#"] || "").trim();
            } else if (metadata[keys[i]]["@"] && metadata[keys[i]]["@"].id && metadata[keys[i]]["@"].id.match(/uuid/i)) {
                this.metadata.UUID = String(metadata[keys[i]]["#"] || "").replace('urn:uuid:', '').toUpperCase().trim();
            } else if (Array.isArray(metadata[keys[i]])) {
                for (j = 0; j < metadata[keys[i]].length; j++) {
                    if (metadata[keys[i]][j]["@"]) {
                        if (metadata[keys[i]][j]["@"]["opf:scheme"] == "ISBN") {
                            this.metadata.ISBN = String(metadata[keys[i]][j]["#"] || "").trim();
                        } else if (metadata[keys[i]][j]["@"].id && metadata[keys[i]][j]["@"].id.match(/uuid/i)) {
                            this.metadata.UUID = String(metadata[keys[i]][j]["#"] || "").replace('urn:uuid:', '').toUpperCase().trim();
                        }
                    }
                }
            }
            break;
        case "meta":
            if (!Array.isArray(metadata[keys[i]])) {
                metadata[keys[i]] = [metadata[keys[i]]];
            }
//            this.metadata.meta = {};
            for (j = 0; j < metadata[keys[i]].length; j++) {
                if (metadata[keys[i]][j]['@']['name'].toLowerCase() == 'cover') {
                    this.metadata.cover = metadata[keys[i]][j]['@']['content'];
                }
            }
            break;
        }
    }
};

/**
 *  EPub#parseManifest() -> undefined
 *
 *  Parses "manifest" block (all items included, html files, images, styles)
 **/
EPub.prototype.parseManifest = function (manifest) {
    var i, len, path = this.rootFile.split("/"), element, path_str;
    path.pop();
    path_str = path.join("/");

    if (manifest.item) {
        for (i = 0, len = manifest.item.length; i < len; i++) {
            if (manifest.item[i]['@']) {
                element = manifest.item[i]['@'];

                if (element.href && element.href.substr(0, path_str.length)  !=  path_str) {
                    element.href = path.concat([element.href]).join("/");
                }

                this.manifest[manifest.item[i]['@'].id] = element;

            }
        }
    }
};

/**
 *  EPub#parseSpine() -> undefined
 *
 *  Parses "spine" block (all html elements that are shown to the reader)
 **/
EPub.prototype.parseSpine = function (spine) {
    var i, len, path = this.rootFile.split("/"), element;
    path.pop();

    if (spine['@'] && spine['@'].toc) {
        this.spine.toc = this.manifest[spine['@'].toc] || false;
    }

    if (spine.itemref) {
        if(!Array.isArray(spine.itemref)){
            spine.itemref = [spine.itemref];
        }
        for (i = 0, len = spine.itemref.length; i < len; i++) {
            if (spine.itemref[i]['@']) {
                if (element = this.manifest[spine.itemref[i]['@'].idref]) {
                    this.spine.contents.push(element);
                }
            }
        }
    }
    this.flow = this.spine.contents;
};

/**
 *  EPub#parseGuide() -> undefined
 *
 *  Parses "guide" block (reference items for reader)
 **/
EPub.prototype.parseGuide = function (guide) {
    var i, len, path = this.rootFile.split("/"), element, path_str,
        id_list = {}, keys;
        
    path.pop();
    path_str = path.join("/");

    keys = Object.keys(this.manifest);
    for (i = 0, len = keys.length; i < len; i++) {
        id_list[this.manifest[keys[i]].href] = keys[i];
    }


    if (guide.reference) {
        if(!Array.isArray(guide.reference)){
            guide.reference = [guide.reference];
        }
        for (i = 0, len = guide.reference.length; i < len; i++) {
            if (guide.reference[i]['@']) {
                element = guide.reference[i]['@'];

                if (element.href && element.href.substr(0, path_str.length)  !=  path_str) {
                    element.href = path.concat([element.href]).join("/");
                }

                // mark reference items on spine
                for (j = 0; j < this.spine.contents.length; j++) {
                    if (this.spine.contents[j].href == element.href) {
                        element.id = this.spine.contents[j].id;
                        this.spine.contents[j].reftype = element.type;
                        this.spine.contents[j].reftitle = element.title;
                    }
                }
                
                // look for id if not on spine
                if (!element.id && this.manifest[id_list[element.href]]) {
                    element.id = this.manifest[id_list[element.href]].id;
                }

                this.guide[element.type] = element;

            }
        }
    }
};


/**
 *  EPub#parseTOC() -> undefined
 *
 *  Parses ncx file for table of contents (title, html file)
 **/
EPub.prototype.parseTOC = function () {
    var that = this;
    var i, len, path = this.spine.toc.href.split("/"), id_list = {}, keys;

    path.pop();

    keys = Object.keys(this.manifest);
    for (i = 0, len = keys.length; i < len; i++) {
        id_list[this.manifest[keys[i]].href] = keys[i];
    }

    fs.readFile(this.unzippedpath + this.spine.toc.href, function (err, data) {

        if (err) {
            that.emit("error", new Error("Reading NCX file failed"));
            return;
        } else {
            var xmlparser = new XML2JS();

            xmlparser.on("end", function (result) {
                if (result.navMap && result.navMap.navPoint) {
                    that.toc = that.walkNavMap(result.navMap.navPoint, path, id_list);
                }
                that.emit("end");
            }).on("error", function (err) {
                that.emit("error", new Error("Parsing NCX failed"));
                return;
            }).parseString(data.toString("utf-8"));
        }

    });
};

/**
 *  EPub#walkNavMap(branch, path, id_list,[, level]) -> Array
 *  - branch (Array | Object): NCX NavPoint object
 *  - path (Array): Base path
 *  - id_list (Object): map of file paths and id values
 *  - level (Number): deepness
 *
 *  Walks the NavMap object through all levels and finds elements
 *  for TOC
 **/
EPub.prototype.walkNavMap = function (branch, path, id_list, level) {
    level = level || 0;

    // don't go too far
    if (level > 7) {
        return [];
    }
    
    var i, len, output = [], element, title, order, href;

    if (!Array.isArray(branch)) {
        branch = [branch];
    }



    for (i = 0, len = branch.length; i < len; i++) {

        if (branch[i].navLabel) {


            title = (branch[i].navLabel && branch[i].navLabel.text || branch[i].navLabel || "");
            if (typeof title === 'object') { title = "———" };
            title = title.trim();
            order = Number(branch[i]["@"] && branch[i]["@"].playOrder || 0);
            href = (branch[i].content && branch[i].content["@"] && branch[i].content["@"].src || "").trim();

            element = {
                level: level,
                order: order,
                title: title
            };

            if (href) {
                href = path.concat([href]).join("/");
                element.href = href;

                if (id_list[element.href]) {
                    // link existing object
                    melement = this.manifest[id_list[element.href]];
                    melement.title = title;
                    melement.order = order;
                    melement.level = level;
                    element.id = melement.id;
                    element['media-type'] = melement['media-type'];
                } else {
                    // use new one
                    element.href = href;
                    element.id =  (branch[i]["@"] && branch[i]["@"].id || "").trim();
                }

                output.push(element);
            }
        }
        if (branch[i].navPoint) {
            output = output.concat(this.walkNavMap(branch[i].navPoint, path, id_list, level + 1));
        }
    }
    return output;
};

/**
 *  EPub#getChapter(id, callback) -> undefined
 *  - id (String): Manifest id value for a chapter
 *  - callback (Function): callback function
 *
 *  Finds a chapter text for an id. Replaces image and link URL's, removes
 *  <head> etc. elements. Return only chapters with mime type application/xhtml+xml
 **/
EPub.prototype.getChapter = function (id, callback) {
    var that = this;
    var i, len, path = this.rootFile.split("/"), keys = Object.keys(this.manifest);
    path.pop();

    if (this.manifest[id]) {

        if ((this.manifest[id]['media-type'] || "").toLowerCase().trim()  !=  "application/xhtml+xml") {
            return callback(new Error("Invalid mime type for chapter"));
        }

//console.log('Reading: ' + that.unzippedpath + that.manifest[id].href);
        fs.readFile(that.unzippedpath + that.manifest[id].href, function (err, data) {
            if (err) {
                callback(new Error("Reading archive failed"));
                return;
            }

            var str = data.toString("utf-8");

            // remove linebreaks (no multi line matches in JS regex!)
            str = str.replace(/\r?\n/g, "\u0000");

            // keep only <body> contents
//            str.replace(/<body([^>]*?>.*<\/)body[^>]*?>/i, function (o, d) {
//                str = '<div ' + d.trim() + 'div>';
//            });
            var head = '';
            str.replace(/<head[^>]*?>(.*)<\/head[^>]*?>/i, function (o, d) {
                head = '<headext>' + d.trim() + '</headext>';
            });
            str.replace(/<body([^>]*?>.*<\/)body[^>]*?>/i, function (o, d) {
                str = head + '<article><div ' + d.trim() + 'div></article>';
            });



            // remove <script> blocks if any
            str = str.replace(/<script[^>]*?>(.*?)<\/script[^>]*?>/ig, function (o, s) {
                return "";
            });

            // remove <style> blocks if any
//            str = str.replace(/<style[^>]*?>(.*?)<\/style[^>]*?>/ig, function (o, s) {
//                return "";
//            });

            // ibook specific --- remove <audio> tags if any
            str = str.replace(/(<audio[^>]*>)/ig, function (o, s) {
                return "";
            });

            // remove onEvent handlers
            str = str.replace(/(\s)(on\w+)(\s*=\s*["']?[^"'\s>]*?["'\s>])/g, function (o, a, b, c) {
                return a + "skip-" + b + c;
            });

            // replace images
            str = str.replace(/(\ssrc\s*=\s*["']?)([^"'\s>]*?)(["'\s>])/g, function (o, a, b, c) {
                var img = path.concat([b]).join("/").trim(),
                    img2 = img.replace(/(\.\.\/)/g, ""),
                    element;

                for (i = 0, len = keys.length; i < len; i++) {
                    if (that.manifest[keys[i]].href == unescape(img)) {
                        element = that.manifest[keys[i]];
                        break;
                    }
                    if (that.manifest[keys[i]].href == unescape(img2)) {
                        element = that.manifest[keys[i]];
                        break;
                    }
                }

                // include only images from manifest
                if (element) {
                    return a + that.paths.contents + element.id + c;
                } else {
                    return "";
                }

            });

            // replace links
            str = str.replace(/([:\s]href\s*=\s*["']?)([^"'\s>]*?)(["'\s>])/g, function (o, a, b, c) {
                var linkparts = b && b.split("#"),
                    link = path.concat([(linkparts.shift() || "")]).join("/").trim(),
                    link2 = link.replace(/(\.\.\/)/g, ""),
                    element;

                for (i = 0, len = keys.length; i < len; i++) {
                    if (that.manifest[keys[i]].href.split("#")[0] == unescape(link)) {
                        element = that.manifest[keys[i]];
                        break;
                    }
                    if (that.manifest[keys[i]].href.split("#")[0] == unescape(link2)) {
                        element = that.manifest[keys[i]];
                        break;
                    }
                }

                anchor = "";
                if (linkparts.length) { anchor  =  "#" + linkparts.join("#"); }
                
                // include only links from manifest
                if (element) {
                    for (i = 0, len = that.spine.contents.length; i < len; i++) {
                        if (element.id == that.spine.contents[i].id) {
                            return a + i + anchor + c;
                        }
                    }
                    return a + that.paths.contents + element.id + anchor + c;
                } else {
                    return a + b + c;
                }

            });

            // bring back linebreaks
            str = str.replace(/\u0000/g, "\n").trim();

            callback(null, str);

        });
    } else {
        callback(new Error("File not found"));
    }
};


// Unzip the .epub file
EPub.prototype.expandBook = function (callback) {
    
    require('child_process').spawn('unzip', ['-o', this.epubpath, '-d', this.unzippedpath]).on('exit', function (code) {
        if (code != 0) {
            this.emit('error', new Error('Unzip failed (code: ' + code + ')'));
        } else callback();
    });
}

// Generate mobile app images from cover
EPub.prototype.createAppleTouchImages = function (callback) {
    var that = this;
        
    var id, cover = this.metadata.cover;
    if (cover && ((this.manifest[cover]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        id = cover;
    } else {
        if (this.guide['cover']) { id = this.guide['cover'].id; }
    }
    if (id && ((this.manifest[id]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-thumbnail', '72x72',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '72x72',
            this.processedpath + 'apple-touch-icon-72x72-precomposed.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-thumbnail', '114x114',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '114x114',
            this.processedpath + 'apple-touch-icon-114x114-precomposed.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-thumbnail', '57x57',
            '-background', 'white',
            '-gravity', 'center',
            '-extent', '57x57',
            this.processedpath + 'apple-touch-icon-precomposed.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-thumbnail', '768x1004',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '768x1004',
            this.processedpath + 'apple-touch-startup-ipad-portrait.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-rotate', '90',
            '-thumbnail', '748x1024',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '748x1024',
            this.processedpath + 'apple-touch-startup-ipad-landscape.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
        imageMagick.convert([
            this.unzippedpath + this.manifest[id].href,
            '-thumbnail', '320x460',
            '-background', 'black',
            '-gravity', 'center',
            '-extent', '320x460',
            this.processedpath + 'apple-touch-startup-iphone.png'
        ], function(err, metadata) {
            if (err) that.emit('error', err);
        });
    }
}

// Generate Table of Contents and store it
EPub.prototype.generateTOC = function () {
    var i, len;
    
//    console.log('Generating table of contents for <' + this.metadata.title + '>');

    var tocxml = '<xml><title>' + this.metadata.title + ' :: Table of contents</title><article><div id="flyleaf-toc"><h1>CONTENTS</h1>';
    tocxml += '<div class="flyleaf-toc-entry"><a href="cover">Cover</a></div>';
    for (i = 0; i < this.toc.length; i++) {
        
        toclink = this.toc[i].href;
        linkparts = toclink && toclink.split("#");
        baselink = linkparts.shift() || "";

        for (j = 0; j < this.spine.contents.length; j++) {
            if (baselink == this.spine.contents[j].href) {
                element = this.spine.contents[j];
                chapter = j;
                break;
            }
        }
        
        anchor = "";
        if (linkparts.length) { anchor  =  "#" + linkparts.join("#"); }
            
        if (element) {
            tocxml += '<div class="flyleaf-toc-entry"><a href="' + chapter + anchor + '">' + this.toc[i].title + '</a></div>';
        }
    }
    tocxml += '</article></xml>';

    fs.writeFile(this.processedpath + 'toc.xml', tocxml, function (err) {
        if (err) throw err;
    });

}

// Generate XML content for single chapter
EPub.prototype.generateChapter = function (chapter) {
//    console.log('Generating <' + this.metadata.title + '>, chapter #' + chapter);

    var that = this;

    if (chapter === undefined) { chapter = 0; } 

    if (this.spine.contents[chapter] != undefined) {
        this.getChapter(this.spine.contents[chapter].id, function (err, data) {
            if (err) {
                throw err;
                return false;
            } else {
                var title = that.spine.contents[chapter].title;
                if (!title) { title = 'Chapter ' + chapter; }
                title = that.metadata.title + ' - ' + title;
                var chapterxml = '<xml><title>' + title + '</title>' + data + '</xml>';
                fs.writeFile(that.processedpath + chapter + '.xml', chapterxml, function (err) {
                    if (err) throw err;
                });
            }
        });
    }

}

// Generate wrapper for cover image
EPub.prototype.generateCover = function () {
    
    var id, cover = this.metadata.cover;
    if (cover && ((this.manifest[cover]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        id = cover;
    } else {
        if (this.guide['cover']) { id = this.guide['cover'].id; }
    }
    if (id && ((this.manifest[id]['media-type'] || "").toLowerCase().trim().substr(0, 6)  ==  "image/")) {
        var coverxml = '<xml><article><center><img src="items/' + id + '" /></center></article></xml>';
    } else {
        var coverxml = '<xml><article><center>No cover image found</center></article></xml>';
    }
    fs.writeFile(this.processedpath + 'cover.xml', coverxml, function (err) {
        if (err) throw err;
    });
}

EPub.prototype.generateContent = function () {
    var that = this;
    fs.mkdir(this.processedpath, function() {
        that.generateTOC();
        for (var i = 0, len = that.flow.length; i < len; i++) {
            that.generateChapter(i);
        }
        that.generateCover();
    });
}


// Expose to the world
module.exports = EPub;
