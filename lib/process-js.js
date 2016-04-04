'use strict';

module.exports = function (gulp, $, config) {
	var lazypipe = require('lazypipe');
	var babelES2015 = require('babel-preset-es2015');
	
	return lazypipe()
		.pipe($.plumber, {
			handleError: function (error) {
				console.log(error);
				this.emit('end');
			}
		})
		// Generate JS source maps
		.pipe(function() { return $.if(config.generateMaps, $.sourcemaps.init()); })
		//.pipe($.debug, {title: 'process-js'})
		
		// Use Babel to transpile from ES2015 to ES5
		.pipe(function() { return $.if('*.js',
			(lazypipe()
				.pipe($.babel, { presets: [ babelES2015 ] } )
				.pipe(function() { return $.if(config.minify, $.uglify()); } )
			)()
		); })
		// write the sourcemap files
		.pipe(function() { return $.if(config.generateMaps, $.sourcemaps.write('.')); });
};
