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
	renameAssets: false, // rename assets to include a revision hash?
	
	/**
	 * Build profiles, each profile can replace some configuration variables.
	 */
	profiles: {
		development: {
			dest: 'target/app/'
		},
		production: {
			dest: 'target/app-prod/',
			vulcanize: true,
			minify: false,
			renameAssets: true
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
			'scripts/*.{js,html}'
		],
		
		/**
		 * The CSS source files to process using PostCSS.
		 * Additionally, all styles in vulcanized elements will also be parsed.
		 */
		styles: [
			'styles/*.{css,html}'
		],
		
		/**
		 * The html files to be vulcanized.
		 */
		vulcanize: [
			'elements/elements*.html'
		],
		
		/**
		 * The html files to be vulcanized.
		 */
		developmentVulcanize: [
			"**/*.{html,js,css}",
			"bower_components/**",
			
			// skip unit test files
			'!bower_components/**/test/**',
			'!bower_components/**/tests/**'
		],
		
		/**
		 * Patterns of included (vulcanized) files to pipe through the JS/CSS processors.
		 */
		vulcanizeProcessFiles: [
			'**',
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
			'bower_components/webcomponentsjs/webcomponents-lite.min.js',
			'bower_components/*/resources/**',
			'bower_components/*/fonts/**/*.{ttf,woff,eot,svg}',
			'bower_components/cbn-ace-editor/src-min-noconflict/**',
			'bower_components/sw-toolbox/sw-toolbox.js',
			'bower_components/sw-toolbox/sw-toolbox.map.json',
			'bower_components/platinum-sw/service-worker.js',
			'bower_components/platinum-sw/bootstrap/*',

			// skip unit test files
			'!bower_components/**/test/**',
			'!bower_components/**/tests/**',
			'!bower_components/font-roboto-local/fonts/robotomono/**'
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
		 * Assets to rename. Renames the files in "from" and changes them in "to"
		 */
		renameAssets: [
			{
				from: [
					'bower_components/webcomponentsjs/webcomponents-lite.min.js',
					'images/**'
				],
				to: [
					'*.jsp',
					'elements/*.html',
					'manifest.json'
				]
			},
			{
				from: [
					'bower_components/platinum-sw/service-worker.js'
				],
				to: [
					'sw-import.js'
				]
			},
			{
				from: [
					'sw-import.js'
				],
				to: [
					'elements/*.html'
				]
			},
			{
				from: [
			'bower_components/*/resources/**',
					'bower_components/*/fonts/**'
				],
				to: [
					'elements/*.html'
				]
			},
			{
				from: [
					'elements/*.html',
					'elements/*.js'
				],
				to: [
					'*.jsp'
				]
			}
		],
		
		cacheConfig:[
			'elements/*.html',
			'elements/*.js',
			'images/**',
			'bower_components/*/resources/**',
			'bower_components/*/fonts/**.ttf',
			'!bower_components/font-roboto-local/fonts/**/*Thin*',
			'!bower_components/font-roboto-local/fonts/**/*Black*',
			'!bower_components/font-roboto-local/fonts/**/*Light*',
			'!bower_components/font-roboto-local/fonts/**/*Medium*'
		],
		
		/**
		 * The patterns of the files to delete
		 * (relative to the destination directory).
		 */
		clean: [
			"target/{app,app-prod}/**",
			// exclude WEB-INF (for java environments)
			"!target/{app}/WEB-INF/**"
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
