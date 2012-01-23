var ZipFile = require("zipfile").ZipFile,
    XML2JS = require("xml2js").Parser,
    utillib = require("util"),
    EventEmitter = require('events').EventEmitter;

//TODO: Cache parsed data

/**
 *  new EPub(fname[, contentroot][, bookroot])
 *  - fname (String): filename for the ebook
 *  - contentroot (String): URL prefix for images
 *  - bookroot (String): URL prefix for links
 *
 *  Creates an Event Emitter type object for parsing epub files
 *
 *      var epub = new EPub("book.epub");
 *      epub.on("end", function () {
 *           console.log(epub.spine);
 *      });
 *      epub.on("error", function (error) { ... });
 *      epub.parse();
 *
 *  Image and link URL format is:
 *
 *      contentroot + img_id + img_zip_path
 *
 *  So an image "logo.jpg" which resides in "OPT/" in the zip archive
 *  and is listed in the manifest with id "logo_img" will have the
 *  following url (providing that contentroot is "/images/"):
 *
 *      /images/logo_img/OPT/logo.jpg
 **/
function EPub(bid, fname, bookroot, contentroot) {
    EventEmitter.call(this);
    this.bookid = bid;
    this.filename = fname;

    this.bookroot = (bookroot || "/").trim();
    this.contentroot = (contentroot || "epub/").trim();

    if (this.contentroot.substr(-1) != "/") {
        this.contentroot += "/";
    }
    if (this.bookroot.substr(-1) != "/") {
        this.bookroot += "/";
    }
}
utillib.inherits(EPub, EventEmitter);

/**
 *  EPub#parse() -> undefined
 *
 *  Starts the parser, needs to be called by the script
 **/
EPub.prototype.parse = function () {

    this.containerFile = false;
    this.mimeFile = false;
    this.rootFile = false;

    this.metadata = {};
    this.manifest = {};
    this.spine    = {toc: false, contents: []};
    this.guide = {};
    this.flow = [];
    this.toc = [];
    this.cover = null;
    

    this.open();
};

/**
 *  EPub#open() -> undefined
 *
 *  Opens the epub file with Zip unpacker, retrieves file listing
 *  and runs mime type check
 **/
EPub.prototype.open = function () {
    try {
        this.zip = new ZipFile(this.filename);
    } catch (E) {
        this.emit("error", new Error("Invalid/missing file"));
        return;
    }

    if (!this.zip.names || !this.zip.names.length) {
        this.emit("error", new Error("No files in archive"));
        return;
    }

    this.checkMimeType();
};

/**
 *  EPub#checkMimeType() -> undefined
 *
 *  Checks if there's a file called "mimetype" and that it's contents
 *  are "application/epub+zip". On success runs root file check.
 **/
EPub.prototype.checkMimeType = function () {
    var i, len;

    for (i = 0, len = this.zip.names.length; i < len; i++) {
        if (this.zip.names[i].toLowerCase() == "mimetype") {
            this.mimeFile = this.zip.names[i];
            break;
        }
    }
    if (!this.mimeFile) {
        this.emit("error", new Error("No mimetype file in archive"));
        return;
    }
    this.zip.readFile(this.mimeFile, (function (err, data) {
        if (err) {
            this.emit("error", new Error("Reading archive failed"));
            return;
        }
        var txt = data.toString("utf-8").toLowerCase().trim();

        if (txt  !=  "application/epub+zip") {
            this.emit("error", new Error("Unsupported mime type"));
            return;
        }

        this.getRootFiles();
    }).bind(this));
};

/**
 *  EPub#getRootFiles() -> undefined
 *
 *  Looks for a "meta-inf/container.xml" file and searches for a
 *  rootfile element with mime type "application/oebps-package+xml".
 *  On success calls the rootfile parser
 **/
EPub.prototype.getRootFiles = function () {
    var i, len;
    for (i = 0, len = this.zip.names.length; i < len; i++) {
        if (this.zip.names[i].toLowerCase() == "meta-inf/container.xml") {
            this.containerFile = this.zip.names[i];
            break;
        }
    }
    if (!this.containerFile) {
        this.emit("error", new Error("No container file in archive"));
        return;
    }

    this.zip.readFile(this.containerFile, (function (err, data) {
        if (err) {
            this.emit("error", new Error("Reading archive failed"));
            return;
        }
        var xml = data.toString("utf-8").toLowerCase().trim(),
            xmlparser = new XML2JS();

        xmlparser.on("end", (function (result) {

            if (!result.rootfiles || !result.rootfiles.rootfile) {
                this.emit("error", new Error("No rootfiles found"));
                return;
            }

            var rootfile = result.rootfiles.rootfile,
                filename = false, i, len;

            if (Array.isArray(rootfile)) {

                for (i = 0, len = rootfile.length; i < len; i++) {
                    if (rootfile[i]["@"]["media-type"] &&
                            rootfile[i]["@"]["media-type"] == "application/oebps-package+xml" &&
                            rootfile[i]["@"]["full-path"]) {
                        filename = rootfile[i]["@"]["full-path"].toLowerCase().trim();
                        break;
                    }
                }

            } else if (rootfile["@"]) {
                if (rootfile["@"]["media-type"]  !=  "application/oebps-package+xml" || !rootfile["@"]["full-path"]) {
                    this.emit("error", new Error("Rootfile in unknown format"));
                    return;
                }
                filename = rootfile["@"]["full-path"].toLowerCase().trim();
            }

            if (!filename) {
                this.emit("error", new Error("Empty rootfile"));
                return;
            }


            for (i = 0, len = this.zip.names.length; i < len; i++) {
                if (this.zip.names[i].toLowerCase() == filename) {
                    this.rootFile = this.zip.names[i];
                    break;
                }
            }

            if (!this.rootFile) {
                this.emit("error", new Error("Rootfile not found from archive"));
                return;
            }

            this.handleRootFile();

        }).bind(this));

        xmlparser.on("error", (function (err) {
            this.emit("error", new Error("Parsing container XML failed"));
            return;
        }).bind(this));

        xmlparser.parseString(xml);


    }).bind(this));
};

/**
 *  EPub#handleRootFile() -> undefined
 *
 *  Parser the rootfile XML and calls rootfile parser
 **/
EPub.prototype.handleRootFile = function () {

    this.zip.readFile(this.rootFile, (function (err, data) {
        if (err) {
            this.emit("error", new Error("Reading archive failed"));
            return;
        }
        var xml = data.toString("utf-8"),
            xmlparser = new XML2JS();

        xmlparser.on("end", this.parseRootFile.bind(this));

        xmlparser.on("error", (function (err) {
            this.emit("error", new Error("Parsing container XML failed"));
            return;
        }).bind(this));

        xmlparser.parseString(xml);

    }).bind(this));
};

/**
 *  EPub#parseRootFile() -> undefined
 *
 *  Parses elements "metadata," "manifest," "spine" and TOC.
 *  Emits "end" if no TOC
 **/
EPub.prototype.parseRootFile = function (rootfile) {

    var i, len, keys, keyparts, key;
    keys = Object.keys(rootfile);
    for (i = 0, len = keys.length; i < len; i++) {
        keyparts = keys[i].split(":");
        key = (keyparts.pop() || "").toLowerCase().trim();
        switch (key) {
        case "metadata":
            this.parseMetadata(rootfile[keys[i]]);
            break;
        case "manifest":
            this.parseManifest(rootfile[keys[i]]);
            break;
        case "spine":
            this.parseSpine(rootfile[keys[i]]);
            break;
        case "guide":
            this.parseGuide(rootfile[keys[i]]);
            break;
        }
    }

    if (this.spine.toc) {
        this.parseTOC();
    } else {
        this.emit("end");
    }
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
                if (!element.id) {
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
    var i, len, path = this.spine.toc.href.split("/"), id_list = {}, keys;
    path.pop();

    keys = Object.keys(this.manifest);
    for (i = 0, len = keys.length; i < len; i++) {
        id_list[this.manifest[keys[i]].href] = keys[i];
    }

    this.zip.readFile(this.spine.toc.href, (function (err, data) {
        if (err) {
            this.emit("error", new Error("Reading archive failed"));
            return;
        }
        var xml = data.toString("utf-8"),
            xmlparser = new XML2JS();

        xmlparser.on("end", (function (result) {
            if (result.navMap && result.navMap.navPoint) {
                this.toc = this.walkNavMap(result.navMap.navPoint, path, id_list);
            }

            this.emit("end");
        }).bind(this));

        xmlparser.on("error", (function (err) {
            this.emit("error", new Error("Parsing container XML failed"));
            return;
        }).bind(this));

        xmlparser.parseString(xml);

    }).bind(this));
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

            title = (branch[i].navLabel && branch[i].navLabel.text || branch[i].navLabel || "").trim();
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
    var i, len, path = this.rootFile.split("/"), keys = Object.keys(this.manifest);
    path.pop();

    if (this.manifest[id]) {

        if ((this.manifest[id]['media-type'] || "").toLowerCase().trim()  !=  "application/xhtml+xml") {
            return callback(new Error("Invalid mime type for chapter"));
        }

        this.zip.readFile(this.manifest[id].href, (function (err, data) {
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
            str = str.replace(/(\ssrc\s*=\s*["']?)([^"'\s>]*?)(["'\s>])/g, (function (o, a, b, c) {
                var img = path.concat([b]).join("/").trim(),
                    element;

                for (i = 0, len = keys.length; i < len; i++) {
                    if (this.manifest[keys[i]].href == unescape(img)) {
                        element = this.manifest[keys[i]];
                        break;
                    }
                }

                // include only images from manifest
                if (element) {
                    return a + this.contentroot + element.id + c;
                } else {
                    return "";
                }

            }).bind(this));

            // replace links
            str = str.replace(/([:\s]href\s*=\s*["']?)([^"'\s>]*?)(["'\s>])/g, (function (o, a, b, c) {
                var linkparts = b && b.split("#"),
                    link = path.concat([(linkparts.shift() || "")]).join("/").trim(),
                    element;

                for (i = 0, len = keys.length; i < len; i++) {
                    if (this.manifest[keys[i]].href.split("#")[0] == unescape(link)) {
                        element = this.manifest[keys[i]];
                        break;
                    }
                }

                anchor = "";
                if (linkparts.length) { anchor  =  "#" + linkparts.join("#"); }
                
                // include only links from manifest
                if (element) {
                    for (i = 0, len = this.spine.contents.length; i < len; i++) {
                        if (element.id == this.spine.contents[i].id) {
                            return a + i + anchor + c;
                        }
                    }
                    return a + this.contentroot + element.id + anchor + c;
                } else {
                    return a + b + c;
                }

            }).bind(this));

            // bring back linebreaks
            str = str.replace(/\u0000/g, "\n").trim();

            callback(null, str);

        }).bind(this));
    } else {
        callback(new Error("File not found"));
    }
};


/**
 *  EPub#getImage(id, callback) -> undefined
 *  - id (String): Manifest id value for an image
 *  - callback (Function): callback function
 *
 *  Finds an image an id. Returns the image as Buffer. Callback gets
 *  an error object, image buffer and image content-type.
 *  Return only images with mime type image
 **/
EPub.prototype.getAsset = function (id, callback) {
    if (this.manifest[id]) {

/*        if ((this.manifest[id]['media-type'] || "").toLowerCase().trim().substr(0, 6)  !=  "image/") {
            return callback(new Error("Inavlid mime type for image"));
        }
*/
        this.zip.readFile(this.manifest[id].href, (function (err, data) {
            if (err) {
                callback(new Error("Reading archive failed"));
                return;
            }

            callback(null, data, this.manifest[id]['media-type']);
        }).bind(this));
    } else {
        callback(new Error("File not found"));
    }
};

// Expose to the world
module.exports = EPub;