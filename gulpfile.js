var gulp        = require('gulp');
var browserSync = require('browser-sync').create();

// Static server
gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./app"
        }
    });
});

gulp.task('clean', function(cb) {
    del(['deploy/**/*'], cb);
});

gulp.task('copy', function() {
  return gulp.src(['dev/index.js'])
    .pipe(gulp.dest('app/'));
});




gulp.task('default', ['browser-sync'], function() {
  gulp.watch(['dev/index.js'], ['copy']);
});
