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
var merge2 = require('merge2');
var lazypipe = require('lazypipe');
var connect = require('gulp-connect');
var minimist = require('minimist');
var fs = require('fs');
var crypto = require('crypto');
var glob = require('glob-all');
var revReplace=require('gulp-rev-replace');
var bower = require('bower');

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
	var stream = merge2();
	var gulpSrc = gulpSrcPath();
	
	var copyFiles = normalizeGlobArray(config.patterns.components);
	copyFiles = copyFiles.concat(normalizeGlobArray(config.patterns.others));
	copyFiles.forEach(function (copySrc) {
		stream.add( gulp.src(copySrc, gulpSrc));
	});
	return stream.pipe(gulp.dest(config.dest));
});


// Generate config data for the <sw-precache-cache> element.
// This include a list of files that should be precached, as well as a (hopefully unique) cache
// id that ensure that multiple PSK projects don't share the same Cache Storage.
// This task does not run by default, but if you are interested in using service worker caching
// in your project, please enable it within the 'default' task.
// See https://github.com/PolymerElements/polymer-starter-kit#enable-service-worker-support
// for more context.
gulp.task('rename-assets', function(callback) {
	if (options.env !== "production") {
		return callback();
	}
	var renameAssets = config.patterns.renameAssets;
	if(!config.patterns.renameAssets || !config.patterns.renameAssets.length){
		return callback();
	}
	var dest = gulpDestPath();
	var manifestPath = path.resolve("./" + config.dest + "rev-manifest.json");
	function rename(idx) {
		if(idx>=renameAssets.length){
			return callback();
		}
		var conf = renameAssets[idx];
		
		var stream = gulp.src(conf.from,dest)
			.on('data', function(p){
				var stat = fs.statSync(p.path);
				if(stat!=null && !stat.isDirectory()) {
					fs.unlinkSync(p.path);
				}
			})
			.pipe($.rev())
			.pipe(gulp.dest(config.dest))
			.pipe($.rev.manifest({
				merge:true,
				base:dest.base,
				cwd: dest.cwd,
				path:manifestPath
			}))
			.pipe(gulp.dest(config.dest))
			.on('end', function () {
				gulp.src(conf.to, dest)
					.pipe($.revReplace({
						manifest: gulp.src(manifestPath),
						replaceInExtensions: {"indexOf": function(){
							//this is a hack to enable all file extensions to be searched into
							//they are using Array.indexOf to search trough the array for the extension
							return 0;
						}}
					}))
					.pipe(gulp.dest(config.dest))
					.on('end', function () {
						rename(++idx);
					});
			});
	}

	rename(0);
});


// Generate config data for the <sw-precache-cache> element.
// This include a list of files that should be precached, as well as a (hopefully unique) cache
// id that ensure that multiple PSK projects don't share the same Cache Storage.
// This task does not run by default, but if you are interested in using service worker caching
// in your project, please enable it within the 'default' task.
// See https://github.com/PolymerElements/polymer-starter-kit#enable-service-worker-support
// for more context.
gulp.task('cache-config', function(callback) {
	if (options.env !== "production") {
		return callback();
	}
	if(!config.patterns.cacheConfig || !config.patterns.cacheConfig.length){
		return callback();
	}
	var cacheConfigF = {
		cacheId: path.basename(__dirname),
		disabled: false
	};
	glob(config.patterns.cacheConfig,
		{
			cwd: path.resolve("./" + config.dest),
			mark:true
		}, function(error, files) {
			if (error) {
				callback(error);
			} else {
				files = files.filter(function(f) { return !/\/$/.test(f); });
				files = files.map(function(f){
					if(f.indexOf("/")!==0){
						return "/" + f;
					}
				});
				cacheConfigF.precache = files;

				var md5 = crypto.createHash('md5');
				md5.update(JSON.stringify(cacheConfigF.precache));
				cacheConfigF.precacheFingerprint = md5.digest('hex');

				var configPath = path.join(config.dest, 'cache-config.json');
				fs.writeFile(configPath, JSON.stringify(cacheConfigF), callback);
			}
		});
});

gulp.task('bower-latest', function (callback) {
	fs.readFile('bower.json', 'utf8', function (err, data) {
		if (err) throw err;
		var bowerFile = JSON.parse(data);
		var dep = bowerFile.dependencies;
		var toUpdate = [];
		for (var i in dep) {
			if (!dep.hasOwnProperty(i)) {
				continue;
			}
			var d = dep[i];
			if (d.indexOf("Polymer/") == 0 || d.indexOf("PolymerElements/") == 0) {
				toUpdate.push(d.substring(0, d.indexOf("#")));
			}
		}
		console.log("bower install --save-exact --force-latest " + toUpdate.join(" "));

		if (toUpdate.length > 0) {
			bower.commands
				.install(toUpdate, {'saveExact': true, 'forceLatest': true})
				.on('end', function (installed) {
					callback();
				})
				.on('log', function (log) {
					if (log.id === "install") {
						console.log(log.message);
					}
				});
		} else {
			callback();
		}

	});
});
gulp.task('bower-update', function (callback) {
	fs.readFile('bower.json', 'utf8', function (err, data) {
		if (err) throw err;
		var bowerFile = JSON.parse(data);
		var dep = bowerFile.dependencies;
		var toUpdate = [];
		for (var i in dep) {
			if (!dep.hasOwnProperty(i)) {
				continue;
			}
			var d = dep[i];
			if (d.indexOf("Polymer/") != 0 && d.indexOf("PolymerElements/") != 0) {
				toUpdate.push(d.substring(0, d.indexOf("#")));
			}
		}
		console.log("bower install " + toUpdate.join(" "));

		if (toUpdate.length > 0) {
			bower.commands
				.install(toUpdate, {'forceLatest': true})
				.on('end', function (installed) {
					callback();
				})
				.on('log', function (log) {
					if (log.id === "install") {
						console.log(log.message);
					}
				})
				.on('error', function (error) {
					console.log(error);
				});
		} else {
			callback();
		}
	});
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
	
	var workaroundJsPipe =
			lazypipe().pipe(function () {
				// workaround for vulcanize '-->' bug
				return $.if(/\.(html|js)/i, (lazypipe()
					.pipe($.replace, /--\\x3e/g, function (val) {
						// console.log('FOUND', val);
						return '-->';
					}))());
			});
	
	var processingPipe = lazypipe()
		.pipe(function() {
			return $.if(config.patterns.vulcanizeProcessFiles, (lazypipe()
				.pipe(function() { return $.if(/\.(html|css)$/i, buildCss()); })
				.pipe(function() { return $.if(/\.(html|js)$/i, buildJs()); })
			)());
		})
		.pipe(workaroundJsPipe);
	
	if (config.vulcanize) {
		// vulcanize the files!
		return gulp.src(config.patterns.vulcanize, gulpSrc)
			// run cripsper and vulcanize on the html files
			.pipe(buildVulcanize(processingPipe, gulpSrc.cwd))
			.pipe(workaroundJsPipe())
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
	vulcanizeFiles = vulcanizeFiles.concat(normalizeGlobArray(config.patterns.vulcanizeWatch));
	
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
		['copy', 'build-scripts', 'build-styles', 'vulcanize'],["rename-assets"],['cache-config'], cb);
});

/**
 * Copy after clean sequence.
 */
gulp.task('clean-copy', function(cb) {
	runSequence('clean-before',
		['copy'], cb);
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
 * Returns the `gulp.src` options object for the destination path.
 * @returns {{cwd: String, base: String}}
 */
function gulpDestPath() {
	return {
		cwd: path.resolve("./" + config.dest),
		base: './' + config.dest
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

