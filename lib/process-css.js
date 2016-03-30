'use strict';

module.exports = function (gulp, $, config) {
	var lazypipe = require('lazypipe');
	var postcssAutoprefixer = require('autoprefixer');
	var postcssCssMqpacker = require('css-mqpacker');
	var postcssCustomMedia = require('postcss-custom-media');
	var postcssDiscardEmpty = require('postcss-discard-empty');
	var postcssImport = require('postcss-import');
	var postcssNesting = require('postcss-nesting');
	var postcssReporter = require('postcss-reporter');
	
	return function() {
		var postcssPlugins = [
			// Transform @import rules by inlining content
			postcssImport(),
			// Transform W3C CSS Custom Media Queries
			postcssCustomMedia(),
			// Unwrap nested rules, following CSS Nesting Module Level 3 specification
			postcssNesting(),
			// Pack same CSS media query rules into one media query rule
			postcssCssMqpacker(),
			// Add vendor prefixes to CSS rules using values from "Can I Use"
			postcssAutoprefixer(config.autoprefixer),
			// Remove empty rules, selectors & media queries
			postcssDiscardEmpty(),
			postcssReporter({
				clearMessages: true
			})
		];
		
		return (lazypipe()
				.pipe($.plumber, {
					handleError: function (error) {
						console.log(error);
						this.emit('end');
					}
				})
				.pipe(function() { return $.if(config.generateMaps, $.sourcemaps.init()); })
				.pipe(function() { return $.if('*.html', $.htmlPostcss(postcssPlugins)); })
				.pipe(function() { return $.if('*.css', $.postcss(postcssPlugins)); })
				.pipe(function() { return $.if(config.generateMaps, $.sourcemaps.write('.')); })
			)();
	}
};
