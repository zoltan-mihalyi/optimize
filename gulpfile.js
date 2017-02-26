var gulp = require("gulp");
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var mocha = require('gulp-mocha');
var clean = require('gulp-clean');
var sourcemaps = require('gulp-sourcemaps');
var istanbul = require('gulp-istanbul');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');
var through2 = require('through2');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('default', ['tslint', 'test']);

gulp.task('clean', function() {
    return gulp.src(['dist', 'coverage'], {read: false})
        .pipe(clean());
});

gulp.task('compile', ['clean'], function() {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(tsProject.options.outDir));
});

gulp.task('tslint', function() {
    return gulp.src('src/**/*.ts')
        .pipe(tslint())
        .pipe(tslint.report());
});

gulp.task('watch', function() {
    gulp.watch('src/**/*.ts', ['compile']);
});

gulp.task('test', ['compile'], function() {
    return gulp.src('test/*.js', {read: false})
        .pipe(mocha());
});

gulp.task('test:instrument', ['compile'], function() {
    return gulp.src('dist/**/*.js')
        .pipe(istanbul())
        .pipe(istanbul.hookRequire());
});

gulp.task('self-optimize', ['compile'], function() {
    var optimize = require('./dist/optimize');
    return gulp.src('angular.js')
        .pipe(through2.obj(function(file, encoding, done) {
            file.contents = new Buffer(optimize(file.contents.toString('UTF-8')));
            this.push(file);
            done();
        }))
        .pipe(gulp.dest(tsProject.options.outDir));
});

gulp.task('test:cover', ['test:instrument'], function() {
    return gulp.src('test/*.js', {read: false})
        .pipe(mocha({timeout: 10000}))
        .pipe(istanbul.writeReports({
            reporters: ['json']
        }))
        .on('end', function() {
            return gulp.src('coverage/coverage-final.json')
                .pipe(remapIstanbul({
                    basePath: 'src',
                    reports: {
                        'json': 'coverage/coverage.json'
                    }
                }))
                .pipe(clean());
        });
});

gulp.task('test:cover-html', ['test:instrument'], function() {
    return gulp.src('test/*.js', {read: false})
        .pipe(mocha({timeout: 10000}))
        .pipe(istanbul.writeReports({
            reporters: ['json']
        }))
        .on('end', function() {
            return gulp.src('coverage/coverage-final.json')
                .pipe(remapIstanbul({
                    reports: {
                        'html': 'coverage/html',
                        'text-summary': null
                    }
                }));
        });
});