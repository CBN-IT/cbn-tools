#!/usr/bin/env node

/**
 * Polymer web application build script with vulcanization and CSS / JS preprocessing features.
 */
'use strict';

// Dependencies:
var path = require('path');
var gulp = require('gulp');
var watch = require('gulp-watch');
var gutil = require('gulp-util');
var chalk = require('chalk');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var lazypipe = require('lazypipe');
var connect = require('gulp-connect');
var minimist = require('minimist');

var options = minimist(process.argv.slice(2), {
	string: [ 'env', 'cwd', 'buildfile' ],
	default: {
		'env': process.env.NODE_ENV || 'default',
		'buildfile': 'cbn-build',
		'cwd': './'
	}
});
var tasks = options._; // free arguments
if (!tasks.length) {
	tasks = ['default'];
}
var configRequired = true;
if (tasks.length == 1 && tasks[0] == 'init') {
	configRequired = false;
}

// Load the build profile.
process.chdir(options.cwd);
var config;
try {
	config = require(path.resolve(options['buildfile']));
} catch (e) {
	if (configRequired) {
		gutil.log(chalk.red('No build config found. Run \'cbn init\' to create one!'), e);
		process.exit(1);
	}
}

function applyProfile(profile) {
	if (profile == 'default') {
		profile = config.defaultProfile || 'development';
	}
	for (var k in config.profiles[profile]) {
		if (!config.profiles[profile].hasOwnProperty(k)) continue;
		config[k] = config.profiles[profile][k];
	}
}
if (config)
	applyProfile(options.env);

var buildJs = require('../lib/process-js')(gulp, $, config);
var buildCss = require('../lib/process-css')(gulp, $, config);
var buildVulcanize = require('../lib/vulcanize')(gulp, $, config);


// Main Tasks
// ----------

gulp.task('init', function() {
	return gulp
		.src(path.join(path.dirname(__dirname), 'cbn-build.sample.js'))
		.pipe($.rename(options['buildfile'] + '.js'))
		.pipe(gulp.dest('./'));
});

/**
 * Clean up task.
 */
gulp.task('clean', function (cb) {
	del(config.patterns.clean)
		.then(function() { cb(); });
});

/**
 * Clean up task (production-only).
 */
gulp.task('clean-before', function (cb) {
	if (options.env == 'production') {
		del(config.patterns.cleanProduction)
			.then(function() { cb(); });
	} else cb();
});

/**
 * Copies the source files to the target directory.
 */
gulp.task('copy', function () {
	var stream = merge();
	var gulpSrc = gulpSrcPath();
	
	var copyFiles = normalizeGlobArray(config.patterns.components);
	copyFiles = copyFiles.concat(normalizeGlobArray(config.patterns.others));
	copyFiles.forEach(function (copySrc) {
		stream.add( gulp.src(copySrc, gulpSrc)
			.pipe(gulp.dest(config.dest)) );
	});
	
	return stream.isEmpty() ? null : stream;
});

/**
 * Compiles the application's JavaScript files.
 */
gulp.task('build-scripts', [ 'copy' ], function () {
	var stream = merge();
	var gulpSrc = gulpSrcPath();
	var buildScripts = normalizeGlobArray(config.patterns.scripts);
	
	buildScripts.forEach(function (scriptPatterns) {
		stream.add( gulp.src(scriptPatterns, gulpSrc)
			.pipe(buildJs())
			.pipe(gulp.dest(config.dest)) );
	});
	return stream.isEmpty() ? null : stream;
});

/**
 * Compiles/post-processes the application's main CSS styles.
 */
gulp.task('build-styles', [ 'copy' ], function () {
	var stream = merge();
	var gulpSrc = gulpSrcPath();
	var buildStyles = normalizeGlobArray(config.patterns.styles);
	
	buildStyles.forEach(function (stylePatterns) {
		stream.add( gulp.src(stylePatterns, gulpSrc)
			.pipe(buildCss())
			.pipe(gulp.dest(config.dest)) );
	});
	return stream.isEmpty() ? null : stream;
});


/**
 * Vulcanizes the web components.
 */
gulp.task('vulcanize', [ 'copy' ], function () {
	var gulpSrc = gulpSrcPath();
	
	var processingPipe = lazypipe()
		.pipe(function() {
			return $.if(config.patterns.vulcanizeProcessFiles, (lazypipe()
				.pipe(function() { return $.if(/\.(html|css)$/i, buildCss()); })
				.pipe(function() { return $.if(/\.(html|js)$/i, buildJs()); })
			)());
		});
	
	if (config.vulcanize) {
		// vulcanize the files!
		return gulp.src(config.patterns.vulcanize, gulpSrc)
			// run cripsper and vulcanize on the html files
			.pipe(buildVulcanize(processingPipe, gulpSrc.cwd))
			// save the files
			.pipe(gulp.dest(config.dest));
	} else {
		// copy the files as-is
		gulp.src(config.patterns.developmentVulcanize, gulpSrc)
			.pipe($.cached('development', { optimizeMemory: true }))
			.pipe(processingPipe())
			.pipe(gulp.dest(config.dest));
	}
});

/**
 * Vulcanizes the web components.
 */
gulp.task('watch', function () {
	var gulpSrc = gulpSrcPath();
	gulpSrc.events = [ 'add', 'change', 'unlink' ];
	var stream = merge();
	
	var copyFiles = normalizeGlobArray(config.patterns.components);
	copyFiles = copyFiles.concat(normalizeGlobArray(config.patterns.others));
	var buildStyles = normalizeGlobArray(config.patterns.styles);
	var buildScripts = normalizeGlobArray(config.patterns.scripts);
	var vulcanizeFiles = normalizeGlobArray(config.patterns.vulcanize);
	vulcanizeFiles = vulcanizeFiles.concat(normalizeGlobArray(config.patterns.vulcanize));
	
	function watchArrExecTask(arr, tasks) {
		arr.forEach(function (watchPatterns) {
			stream.add(
				watch(watchPatterns, gulpSrc, $.batch(function (events, done) {
						runSequence(tasks, done);
					}))
					.on('error', function(error) {
						// ignore file not found errors (caused by temporary files being used by some IDEs)
						if (error && error.code == 'ENOENT') {
							return;
						}
						console.log('Watch/build error:', error);
					})
			);
		});
	}
	
	watchArrExecTask(copyFiles, 'copy');
	watchArrExecTask(buildScripts, 'build-scripts');
	watchArrExecTask(buildStyles, 'build-styles');
	watchArrExecTask(vulcanizeFiles, 'vulcanize');
	
	return stream.isEmpty() ? null : stream;
});

/**
 * Serves the built application.
 */
gulp.task('serve',
	function (cb) {
		applyProfile('serve');
		runSequence('default', function() {
			connect.server({
				root: config.dest
			});
			runSequence('watch', cb);
		});
});

/**
 * The default task.
 */
gulp.task('default', function(cb) {
	runSequence('clean-before', 
		['copy', 'build-scripts', 'build-styles', 'vulcanize'], cb);
});


// Test Tasks
// ----------

// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp);


/*
 * Run gulp.
 */

require('../lib/gulp-log-events')(gulp);
process.nextTick(function () {
	gulp.start.apply(gulp, tasks);
});

/*
 * Utility functions.
 */

/**
 * Returns the `gulp.src` options object for a source path.
 * @returns {{cwd: String, base: String}}
 */
function gulpSrcPath() {
	return {
		cwd: path.resolve("./" + config.src),
		base: './' + config.src
	};
}

/**
 * Checks if a given glob array has nested lists and returns the normalized array (array of arrays).
 * 
 * @param {Array} globs The input globs.
 * @return {[Array]} The normalized globs list.
 */
function normalizeGlobArray(globs) {
	if (!globs || !globs.length)
		return [];
	if (!Array.isArray(globs[0])) {
		return [ globs ]; // array of 1 glob list
	}
	return globs;
}

