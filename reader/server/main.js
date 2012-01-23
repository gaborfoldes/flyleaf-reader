var server = require("./server")
var router = require("./router")
var EpubServer = require("./epub-server")
var NodeStatic = require('node-static');


var staticServer = new NodeStatic.Server("./static");
var serveFile = staticServer.serve.bind(staticServer);

var reader = new NodeStatic.Server("../");
reader.serveReader = function (req, res) {
    this.serveFile('/reader/index.html', 200, {}, req, res);
}
var readBook = reader.serveReader.bind(reader);
var readerFiles = reader.serve.bind(reader);

var epubServer = new EpubServer.Server();
epubServer.loadEpub('stevejobs', 'books/stevejobs.epub');
epubServer.loadEpub('alice', 'books/alice.epub');
epubServer.loadEpub('dino', 'books/dinosaur.epub');
epubServer.loadEpub('moneyball', 'books/moneyball.epub');

var displayChapter = epubServer.serveChapter.bind(epubServer);
var displayAsset = epubServer.serveAsset.bind(epubServer);
var displayTOC = epubServer.serveTOC.bind(epubServer);
var displayCover = epubServer.serveCover.bind(epubServer);

var that = this;

var handlers = [
    ['^/(?:(?:about.html)|(?:favicon.ico))$', serveFile],
//    ['^/$', serveFile],
    ['^/([^/]*)/contents/toc$', displayTOC],
    ['^/([^/]*)/contents/cover$', displayCover],
    ['^/([^/]*)/contents/([0-9]*)$', displayChapter],
    ['^/([^/]*)/epub/([^/]*)$', displayAsset],
    ['^/([^/]*)/contents/epub/([^/]*)$', displayAsset],
    ['^/([^/]*)/(([0-9]*)|(toc)|(cover))$', readBook],
    ['^/reader/.*$', readerFiles]
];

server.start(router.route, handlers);