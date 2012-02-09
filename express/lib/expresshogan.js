var hogan = require('hogan.js');
var fs = require('fs');
//var _ = require('underscore');


(function (expressHogan) {
    expressHogan.root = '';
    expressHogan.partials = {};
    expressHogan.cached = true;
	expressHogan.compile = function(source, options) {
		if (typeof source == 'string') {
			return function(options) {
				options.locals = options.locals || {};
				options.partials = options.partials || {};

				if (options.body) {
					options.locals.body = options.body;
				}

				var template = hogan.compile(source);

                var count = options.partials.length || 1;
				for (var i in options.partials) {
					if (typeof options.partials[i].r == 'function') continue;
					options.partials[i] = hogan.compile(expressHogan.loadPartial(options.partials[i]));
				}
				
			    return template.render(options.locals, options.partials);
				
			};
		} else {
			return source;
		}
	};
	
	expressHogan.loadPartial = function(partial) {
		if (!(partial in expressHogan.partials) || !expressHogan.cached) {
            if (!~partial.indexOf('.')) partial += '.mustache';
			expressHogan.partials[partial] = fs.readFileSync(expressHogan.root + '/' + partial, 'utf-8');
		}
		return expressHogan.partials[partial];
	};
	
	expressHogan.set = function (key, value) {
	    switch (key) {
	        case 'root': expressHogan.root = value; break;
	        case 'cached': expressHogan.cached = value; break;
	    }
	}
	
	
})(typeof exports !== 'undefined' ? exports : expressHogan);