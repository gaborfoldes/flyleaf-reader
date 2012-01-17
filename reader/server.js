var http = require("http");
var url = require("url");

function start(route, handlers) {

    function onRequest(req, res) {
        var pathname = url.parse(req.url).pathname;
        console.log("Request for  " + pathname + " received.");
        
        route(req, res, handlers); 
    }

    http.createServer(onRequest).listen(8888);
    console.log("Server started.");

}

exports.start = start;
