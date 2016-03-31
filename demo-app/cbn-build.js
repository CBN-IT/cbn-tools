'use strict';

/**
 * The web app's source directory.
 */
module.exports = {
	src: 'webapp/',
	dest: '', // specified by profiles
	
	// default build options (can be overridden by profiles)
	vulcanize: false, // vulcanize the elements or copy them as-is?
	generateMaps: false, // generate source maps?
	minify: false, // minify / uglify the JavaScript code?
	crisper: true, // run crisper to split JS from the HTML files?
	crisperIncludeScript: false, // tell crisper to include the newly split <script> from the HTML?
	
	/**
	 * Build profiles, each profile can replace some configuration variables.
	 */
	profiles: {
		demo: {
			dest: 'target/demo/',
			vulcanize: true
		},
		development: {
			dest: 'target/app/'
		},
		production: {
			dest: 'target/app-prod/',
			vulcanize: true,
			minify: false
		}
	},
	defaultProfile: 'development',
	
	/**
	 * GLOB patterns of the files to be copied / processed by the build system.
	 */
	patterns: {
		/**
		 * The JavaScript files to process using Babel.
		 * Additionally, all vulcanized scripts will also be converted.
		 */
		scripts: [
			'scripts/*.{js,html}',
			"!bower_components/**"
		],
		
		/**
		 * The CSS source files to process using PostCSS.
		 * Additionally, all styles in vulcanized elements will also be parsed.
		 */
		styles: [
			'styles/**/*.{css,html}',
			"!bower_components/**"
		],
		
		/**
		 * The html files to be vulcanized.
		 */
		vulcanize: [
			'elements/elements.html'
		],
		
		/**
		 * The html files to be vulcanized.
		 */
		developmentVulcanize: [
			"**/*.{html,js,css}",
			"bower_components/**"
		],
		
		/**
		 * Patterns of included (vulcanized) files to pipe through the JS/CSS processors.
		 */
		vulcanizeProcessFiles: [
			'**',
			'!**/test_inline.js',
			'!bower_components/**'
		],
		
		/**
		 * Patterns to watch for changes in vulcanized elements.
		 */
		vulcanizeWatch: [
			'**',
			'!bower_components/**'
		],
		
		/**
		 * Path to the bower components to be copied to the target directory.
		 */
		components: [
			'bower_components/webcomponentsjs/webcomponents-lite.js',
			'bower_components/*/resources/*',
			'bower_components/*/fonts/*',
			
			// skip unit test files
			'!bower_components/**/test/**',
			'!bower_components/**/tests/**'
		],
		
		/**
		 * Other files to be copied (unmodified) to the target directory.
		 */
		others: [
			[
				"**",
				'!bower_components/**',
				'!**/*.{html,js,css}'
			],
			[ "*.{html,js,css}" ]
		],
		
		/**
		 * The patterns of the files to delete
		 * (relative to the destination directory).
		 */
		clean: [
			"target/{demo,app,app-prod}/**",
			"!target/{demo,app}/WEB-INF/**"
		],
		/**
		 * Production-only clean patterns (always executed before the build task on production).
		 */
		cleanProduction: [
			"target/app-prod/**"
		]
	},
	
	/**
	 * PostCSS AutoPrefixer plugin config.
	 * https://github.com/postcss/autoprefixer
	 */
	autoprefixer: {
		/**
		 * https://github.com/WebComponents/webcomponentsjs#browser-support
		 */
		browsers: [
			'Explorer >= 10',
			'ExplorerMobile >= 10',
			'Firefox >= 30',
			'Chrome >= 34',
			'Safari >= 7',
			'Opera >= 23',
			'iOS >= 7',
			'Android >= 4.4',
			'BlackBerry >= 10'
		]
	}
	
};
