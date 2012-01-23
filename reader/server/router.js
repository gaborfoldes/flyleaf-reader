

var sys = require('sys');
var url = require('url');

var route = function(req, res, urls, passed_args){

    var pathname = url.parse(req.url).pathname;

    for (var i=0;i<urls.length;i++){
        var args = new RegExp(urls[i][0]).exec(pathname);
        if (args !== null){
            console.log("About to route a request for " + urls[i][0]);
            args.shift();
            args.unshift(req, res);
            if (typeof passed_args == 'array')
                args.concat(passed_args);
            urls[i][1].apply(this, args);
            return true;
        }
    }

    console.log("No request handler found for " + pathname);
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Not found");
    res.end();
    return false;
};

var include = function(urls){
    return function(req, res){
        route(req, res, urls, Array.prototype.slice.call(arguments, 2));
    };
};

exports.route = route;
exports.include = include

/*
function route(handle, pattern, request, response) {
  console.log("About to route a request for " + pattern);
  if (typeof handle[pathname] === 'object' && typeof handle[pathname].serve === 'function') {
    handle[pathname].serve(request, response);
  } else {
    console.log("No request handler found for " + pathname);
    response.writeHead(404, {"Content-Type": "text/plain"});
    response.write("404 Not found");
    response.end();
  }
}

exports.route = route;
*/