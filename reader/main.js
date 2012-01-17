var server = require("./server")
var router = require("./router")
var EpubServer = require("./epub-server")
var NodeStatic = require('node-static');


var staticServer = new NodeStatic.Server("./static");
var serveFile = staticServer.serve.bind(staticServer);

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
    ['^/(?:(?:index.html)|(?:favicon.ico))$', serveFile],
//    ['^/$', serveFile],
    ['^/([^/]*)(/|/toc)?$', displayTOC],
    ['^/([^/]*)/cover$', displayCover],
    ['^/([^/]*)/([0-9]*)$', displayChapter],
    ['^/([^/]*)/contents/([^/]*)$', displayAsset]
]

server.start(router.route, handlers);