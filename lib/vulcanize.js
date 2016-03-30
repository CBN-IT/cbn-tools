'use strict';

module.exports = function (gulp, $, config) {
	var lazypipe = require('lazypipe');
	var dom = require('gulp-dom');
	var GulpResolver = require('./hyd-gulp-resolver');
	
	return function(processStream, base) {
		var resolver = new GulpResolver({
				stream: processStream,
				basePath: base,
				includeBase: base
			});
		return (lazypipe()
				.pipe($.plumber, {
						handleError: function (error) {
							console.log(error);
							this.emit('end');
						}
					})
				
				// Vulcanize the elements
				.pipe($.vulcanize, {
					stripComments: true,
					inlineCss: true,
					inlineScripts: true,
					fsResolver: resolver
				})
				.pipe($.debug, {title: 'vulcanize'})
				
				// Split inline scripts from an HTML file for CSP compliance
				.pipe(function() {
					var crisperOpts = {};
					if (!config.crisperIncludeScript) {
						crisperOpts.onlySplit = true;
					}
					return $.if(config.crisper ? '*.html' : false, $.crisper(crisperOpts ));
				})
				
				// Cleanup the vulcanized HTML file
				.pipe(function() {
					return $.if('*.html', (lazypipe()
						.pipe(function() {
							return dom(function() {
								return this.querySelector('[by-vulcanize]').innerHTML;
							}, false)
						})
					)());
				})
				.pipe(resolver.injectExtras.bind(resolver))
				
				// Minify the vulcanized HTML files
				// https://github.com/PolymerLabs/polybuild/issues/3
				.pipe(function() {
					return $.if((config.minify ? '*.html': false), $.htmlmin({
						customAttrAssign: [
							{ source: '\\$=' }
						],
						customAttrSurround: [
							[ {source: '\\({\\{'}, {source: '\\}\\}'} ],
							[ {source: '\\[\\['}, {source: '\\]\\]'} ]
						],
						removeComments: true,
						collapseWhitespace: true
					}))
				})
			
		)(); // return the lazypipe's result
	};
};
