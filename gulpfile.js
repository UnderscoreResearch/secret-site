// Load plugins
const autoprefixer = require("gulp-autoprefixer");
const cleanCSS = require("gulp-clean-css");
const gulp = require("gulp");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const open = require("gulp-open");
const concat = require("gulp-concat");
const sass = require("gulp-sass");
const connect = require("gulp-connect");
const htmlmin = require('gulp-htmlmin');
const del = require('del');

const webpack = require('webpack-stream');

gulp.task('css-scss', function () {
    return gulp.src("./scss/*.scss")
        .pipe(plumber())
        .pipe(sass({
            outputStyle: "expanded"
        }))
        .on("error", sass.logError)
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(gulp.dest("./css"))
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(cleanCSS())
        .pipe(gulp.dest("./css"))
        .pipe(connect.reload());
});

gulp.task('css-concat', function () {
    return gulp.src(["./node_modules/@fortawesome/fontawesome-free/css/all.min.css",
        "./node_modules/bootstrap/dist/css/bootstrap.min.css",
        "./node_modules/quill/dist/quill.snow.css",
        "./node_modules/swagger-ui/dist/swagger-ui.css",
        "./css/app.css"])
        .pipe(concat("bundle.css"))
        .pipe(cleanCSS())
        .pipe(gulp.dest("dist"))
        .pipe(connect.reload());
});

gulp.task('css', gulp.series('css-scss', 'css-concat'));

gulp.task('clean', function () {
    return del([
        'dist/**/*'
    ]);
});

gulp.task('static-img', function () {
    return gulp.src([
            './img/*'
        ])
        .pipe(gulp.dest('./dist/img'))
        .pipe(connect.reload());
});

gulp.task('favicon', function () {
    return gulp.src([
            './favicon.ico',
            './sitemap.xml'
        ])
        .pipe(gulp.dest('./dist'));
});

gulp.task('patch', function () {
    return gulp.src([
        './patches/instascan/*'
    ])
        .pipe(gulp.dest('./node_modules/instascan/src'));
});

gulp.task('patch-prod', function () {
    return gulp.src([
        './patches/prod/*'
    ])
        .pipe(gulp.dest('./js'));
});

gulp.task('patch-dev', function () {
    return gulp.src([
        './patches/dev/*'
    ])
        .pipe(gulp.dest('./js'));
});

gulp.task('static-video', function () {
    return gulp.src([
        './video/*'
    ])
        .pipe(gulp.dest('./dist/video'));
});

gulp.task('static-fonts', function () {
    return gulp.src([
        './webfonts/*',
        './node_modules/@fortawesome/fontawesome-free/webfonts/*'
    ])
        .pipe(gulp.dest('./dist/webfonts'));
});

gulp.task('static', gulp.parallel('static-img', 'static-video', 'static-fonts', 'favicon'));

gulp.task('html', function () {
    return gulp.src([
        './page-fragments/header.html',
        './page-fragments/[0-9]*.html',
        './page-fragments/footer.html',
    ])
        .pipe(concat("index.html"))
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true,
            ignoreCustomFragments: [ /\{\{[^\}]*\}\}/ ],
            processScripts: [
                "x-unrendered",
                "x-tmpl-mustache"
            ]
        }))
        .pipe(gulp.dest('./dist'))
        .pipe(connect.reload());
});

gulp.task("js", function () {
    return gulp.src('./js/app.js')
        .pipe(webpack(require('./webpack.prod.js')))
        .pipe(gulp.dest('dist/'));
});

gulp.task("js-dev", function () {
    return gulp.src('./js/app.js')
        .pipe(webpack(require('./webpack.dev.js')))
        .pipe(gulp.dest('dist/'))
        .pipe(connect.reload());
});

gulp.task('connect', function () {
    return connect.server({
        root: './dist',
        livereload: true
    });
});

gulp.task('connect-test', function () {
    return connect.server({
        root: './dist',
        port: 8081
    });
});

gulp.task('watch', function (cb) {
    gulp.watch("./scss/**/*", gulp.parallel('css'));
    gulp.watch("./page-fragments/*", gulp.parallel('html'));
    gulp.watch(["./img/*", "./video/*"], gulp.parallel('static'));
    gulp.watch(["./js/**/*.js"], gulp.parallel("js-dev"));

    cb();
});

gulp.task("open", function() {
    gulp.src(__filename)
        .pipe(open({uri: 'http://localhost:8080'}))
});

gulp.task("default", gulp.series('clean', gulp.parallel("patch", "patch-prod"), gulp.parallel('css', 'static', 'html', "js")));

gulp.task("start", gulp.series("default", gulp.parallel("connect", "open")));

gulp.task("test", gulp.series('clean', gulp.parallel("patch", "patch-dev"), gulp.parallel('css', 'static', 'html', "js"), "connect-test"));

gulp.task("dev", gulp.series(gulp.parallel("patch", "patch-dev"), gulp.parallel('css', 'static', 'html', "js-dev"), gulp.parallel("watch", "connect")));
